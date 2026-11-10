/**
 * The components a case study's MDX can use without importing them. `CaseStudyPage` passes this map
 * to `<Content components={...} />`. Add a component here and every case study can use it; images
 * are still imported in the MDX file that shows them.
 */
import ArchitectureDiagram from './ArchitectureDiagram.astro';
import CostComparison from './CostComparison.astro';
import DashboardMap from './DashboardMap.astro';
import Limitations from './Limitations.astro';
import ProblemLog from './ProblemLog.astro';
import ScalingPath from './ScalingPath.astro';
import ScreenshotGallery from './ScreenshotGallery.astro';
import TechStack from './TechStack.astro';
import ThemedScreenshot from './ThemedScreenshot.astro';
import TradeOff from './TradeOff.astro';

export const mdxComponents = {
  ArchitectureDiagram,
  CostComparison,
  DashboardMap,
  Limitations,
  ProblemLog,
  ScalingPath,
  ScreenshotGallery,
  TechStack,
  ThemedScreenshot,
  TradeOff,
};
