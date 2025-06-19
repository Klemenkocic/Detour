declare module '*.jsx' {
    const C: React.ComponentType<any>;
    export default C;
  }
  
  ///  allow "import './something.js'"
  declare module '*.js' {
    const anyExport: any;
    export = anyExport;
  }
  
  /*  specific file that ships the loose Google-Maps style array */
  declare module './detourMapStyle.js' {
    import type { MapTypeStyle } from 'google.maps';
    const styles: MapTypeStyle[];
    export default styles;
  }

declare global {
  interface Window {
    google?: typeof google;
  }
}

export {};