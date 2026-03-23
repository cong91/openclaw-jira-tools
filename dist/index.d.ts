import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
declare const plugin: {
    id: string;
    name: string;
    version: string;
    register(api: OpenClawPluginApi): void;
};
export default plugin;
