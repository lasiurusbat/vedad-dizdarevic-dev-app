// Official AWS Architecture Icons, unmodified (see src/assets/aws-icons/README.md). `?url` gives a
// file URL, so they load as <img> from 'self' and need nothing from the CSP.
import awsCloud from '../assets/aws-icons/aws-cloud.svg?url';
import awsCloudDark from '../assets/aws-icons/aws-cloud-dark.svg?url';
import ecr from '../assets/aws-icons/ecr.svg?url';
import elb from '../assets/aws-icons/elastic-load-balancing.svg?url';
import fargate from '../assets/aws-icons/fargate.svg?url';
import guardduty from '../assets/aws-icons/guardduty.svg?url';
import rds from '../assets/aws-icons/rds.svg?url';
import s3 from '../assets/aws-icons/s3.svg?url';
import ses from '../assets/aws-icons/ses.svg?url';
import sns from '../assets/aws-icons/sns.svg?url';

export const icons = { ecr, elb, fargate, guardduty, rds, s3, ses, sns };
export const cloudIcon = { light: awsCloud, dark: awsCloudDark };
