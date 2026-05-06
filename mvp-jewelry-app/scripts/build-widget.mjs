import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/widget/index.ts"],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: "es2020",
  format: "iife",
  globalName: "PendantBuilder",
  outfile: "public/embed/pendant-builder.js",
  logLevel: "info"
});

console.log("✅ Widget built → public/embed/pendant-builder.js");
