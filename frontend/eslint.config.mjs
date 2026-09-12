import next from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "public/sw.js"] },
  ...next,
  ...typescript,
  {
    rules: {
      // Reading localStorage, sessionStorage or the URL after mount is how this app
      // stays correct through hydration: the value does not exist while rendering on
      // the server. Kept visible as a warning rather than silenced.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
export default config;
