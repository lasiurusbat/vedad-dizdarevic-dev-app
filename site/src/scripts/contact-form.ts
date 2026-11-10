// The contact form's behaviour: Turnstile on first use, field checks, the JSON post and the
// status line. Bundled by Astro from ContactForm.astro; state is `hidden`, attributes and classes.
import { EMAIL, MESSAGE_MIN } from '@vdd/contact-schema';

interface TurnstileApi {
  render(
    el: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: 'light' | 'dark';
      language: string;
      appearance: 'interaction-only';
      size: 'flexible';
      callback(token: string): void;
      'error-callback'(): void;
      'expired-callback'(): void;
    },
  ): string;
  reset(id: string): void;
}
type TurnstileWindow = Window & { turnstile?: TurnstileApi };

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
// Long enough for a person to solve a challenge, should Turnstile ask for one.
const TOKEN_WAIT_MS = 60_000;

export function initContactForm(form: HTMLFormElement): void {
  const { dataset } = form;
  const widget = form.querySelector<HTMLElement>('[data-widget]')!;
  const status = form.querySelector<HTMLElement>('[data-status]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  form.hidden = false;

  let api: Promise<TurnstileApi> | undefined;
  let widgetId: string | undefined;
  let token = '';
  let onToken: ((value: string) => void) | undefined;

  const loadApi = () =>
    (api ??= new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT;
      script.async = true;
      script.onload = () => {
        const loaded = (window as TurnstileWindow).turnstile;
        if (loaded) resolve(loaded);
        else reject(new Error('Turnstile did not load'));
      };
      script.onerror = () => reject(new Error('Turnstile did not load'));
      document.head.append(script);
    }));

  /** Loads and renders once, on the first sign that someone is using the form. */
  const startWidget = async () => {
    const turnstile = await loadApi();
    widgetId ??= turnstile.render(widget, {
      sitekey: dataset.sitekey!,
      action: 'contact',
      theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
      language: dataset.language!,
      appearance: 'interaction-only',
      size: 'flexible',
      callback: (value) => {
        token = value;
        onToken?.(value);
      },
      'error-callback': () => {
        token = '';
      },
      'expired-callback': () => {
        token = '';
      },
    });
  };

  /** Tokens work once: a new one is needed after every attempt. */
  const resetWidget = async () => {
    token = '';
    if (widgetId !== undefined) (await loadApi()).reset(widgetId);
  };

  const waitForToken = () =>
    new Promise<string>((resolve, reject) => {
      if (token) return resolve(token);
      const timer = setTimeout(() => reject(new Error('No token')), TOKEN_WAIT_MS);
      onToken = (value) => {
        clearTimeout(timer);
        resolve(value);
      };
    });

  form.addEventListener('focusin', () => void startWidget().catch(() => {}), { once: true });

  const show = (message: string, kind?: 'ok' | 'error') => {
    status.hidden = false;
    status.textContent = message;
    status.classList.toggle('is-ok', kind === 'ok');
    status.classList.toggle('is-error', kind === 'error');
  };

  const setInvalid = (input: HTMLInputElement | HTMLTextAreaElement, invalid: boolean) => {
    input.setAttribute('aria-invalid', String(invalid));
    form.querySelector<HTMLElement>(`#${input.id}-error`)!.hidden = !invalid;
  };

  const fields = {
    name: form.elements.namedItem('name') as HTMLInputElement,
    email: form.elements.namedItem('email') as HTMLInputElement,
    message: form.elements.namedItem('message') as HTMLTextAreaElement,
  };
  const checks: [HTMLInputElement | HTMLTextAreaElement, (value: string) => boolean][] = [
    [fields.name, (v) => v.length > 0],
    [fields.email, (v) => EMAIL.test(v)],
    [fields.message, (v) => v.length >= MESSAGE_MIN],
  ];

  /** Marks every field; focus goes to the first problem. */
  const validate = () => {
    let first: HTMLElement | undefined;
    for (const [input, check] of checks) {
      const ok = check(input.value.trim());
      setInvalid(input, !ok);
      if (!ok) first ??= input;
    }
    first?.focus();
    return !first;
  };

  // Once marked, a field clears as soon as it is right, not on the next submit.
  for (const [input, check] of checks) {
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true' && check(input.value.trim())) {
        setInvalid(input, false);
      }
    });
  }

  const errorFor = (httpStatus: number) => {
    if (httpStatus === 403) return dataset.errorVerification!;
    if (httpStatus === 400) return dataset.errorInvalid!;
    return dataset.errorFailed!;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.hidden = true;
    if (!validate()) return;

    submit.disabled = true;
    show(dataset.sending!);
    try {
      await startWidget();
      const body = {
        type: new FormData(form).get('type'),
        name: fields.name.value,
        email: fields.email.value,
        message: fields.message.value,
        language: dataset.language,
        website: (form.elements.namedItem('website') as HTMLInputElement).value,
        token: await waitForToken(),
      };
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        form.reset();
        show(dataset.success!, 'ok');
      } else {
        show(errorFor(response.status), 'error');
      }
    } catch {
      // Turnstile blocked or unreachable, or no network: nothing was sent.
      show(dataset.errorFailed!, 'error');
    } finally {
      submit.disabled = false;
      status.focus();
      void resetWidget().catch(() => {});
    }
  });
}
