import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Die Edge-Function-Module nutzen Deno-Spezifizierer; für Tests auf das
      // installierte npm-Paket mappen.
      "npm:@supabase/supabase-js@2.57.2": "@supabase/supabase-js",
    },
  },
});
