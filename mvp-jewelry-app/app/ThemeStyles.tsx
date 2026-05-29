import { buildThemeCss } from "@/src/lib/theme/themes";

export default function ThemeStyles() {
  return <style id="caratlabs-theme-vars" dangerouslySetInnerHTML={{ __html: buildThemeCss() }} />;
}
