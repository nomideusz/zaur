import Root from './Root.svelte';
import Toolbar from './Toolbar.svelte';
import Renderer from './Renderer.svelte';

export {
  type PdfViewerContext,
  type PdfViewerRootProps
} from './Root.svelte';
export { type PdfToolbarProps } from './Toolbar.svelte';

export const PdfViewer = {
  Root,
  Toolbar,
  Renderer
};

export { Root, Toolbar, Renderer };
