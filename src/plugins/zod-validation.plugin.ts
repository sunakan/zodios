import { ZodiosError } from "../zodios-error";
import type { ZodiosPlugin } from "../zodios.types";
import { findEndpoint } from "./zodios-plugins.utils";

const plugin: ZodiosPlugin = {
  name: "zod-validation",
  request: async (api, config) => {
    const endpoint = findEndpoint(api, config.method, config.url);
    if (!endpoint) {
      throw new Error(`No endpoint found for ${config.method} ${config.url}`);
    }
    const { parameters } = endpoint;
    if (!parameters) {
      return config;
    }
    const paramsOf = {
      Query: (name: string) => config.queries?.[name],
      Body: (_: string) => config.data,
      Header: (name: string) => config.headers?.[name],
    };
    const setParamsOf = {
      Query: (name: string, value: any) => (config.queries![name] = value),
      Body: (_: string, value: any) => (config.data = value),
      Header: (name: string, value: any) => (config.headers![name] = value),
    };
    for (const parameter of parameters) {
      const { name, schema, type } = parameter;
      const value = paramsOf[type](name);
      if (value) {
        const parsed = schema.safeParse(value);
        if (!parsed.success) {
          throw new ZodiosError(
            `Zodios: Invalid ${type} parameter '${name}'`,
            config,
            value,
            parsed.error
          );
        }
        setParamsOf[type](name, parsed.data);
      }
    }
    return config;
  },
  response: async (api, config, response) => {
    const endpoint = findEndpoint(api, config.method, config.url);
    /* istanbul ignore next */
    if (!endpoint) {
      throw new Error(`No endpoint found for ${config.method} ${config.url}`);
    }
    const parsed = endpoint.response.safeParse(response.data);
    if (!parsed.success) {
      throw new ZodiosError(
        "Zodios: Invalid response",
        config,
        response.data,
        parsed.error
      );
    }
    response.data = parsed.data;
    return response;
  },
};

/**
 * Zod validation plugin used internally by Zodios.
 * By default zodios always validates the response.
 * @returns zod-validation plugin
 */
export function zodValidationPlugin(): ZodiosPlugin {
  return plugin;
}
