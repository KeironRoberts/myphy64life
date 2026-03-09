declare global {
  interface Window {
    problems: any;
    __gameLoaded?: boolean;
    problemSolverDragSetup?: boolean;
    problemSolverNativeDragActive?: boolean;
    problemSolverDragMode?: 'mobile' | 'native';
    currentUser?: any;
  }

  // Make Event a bit more permissive for this project
  interface Event {
    target: HTMLElement | null;
    detail?: any;
    button?: number;
  }

  interface Element {
    dataset?: DOMStringMap;
    style?: any;
    draggable?: boolean;
    tabIndex?: number;
    value?: string;
    id?: string;
    matches?: (s: string) => boolean;
    closest?: (s: string) => Element | null;
    querySelector?: (s: string) => Element | null;
  }

  interface Node {
    matches?: (s: string) => boolean;
    querySelector?: (s: string) => Element | null;
  }

  interface EventTarget {
    classList?: DOMTokenList;
    closest?: (s: string) => Element | null;
    matches?: (s: string) => boolean;
    id?: string;
    dataset?: DOMStringMap;
    value?: string;
    style?: any;
    clientX?: number;
    clientY?: number;
  }
}

export {};
