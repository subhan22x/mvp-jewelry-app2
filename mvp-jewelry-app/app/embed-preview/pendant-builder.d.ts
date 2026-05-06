
declare namespace JSX {
  interface IntrinsicElements {
    "pendant-builder": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        "store-id"?: string;
        "api-base"?: string;
        mode?: string;
        theme?: string;
      },
      HTMLElement
    >;
  }
}
