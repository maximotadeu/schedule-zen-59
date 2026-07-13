export function useDevMode(): boolean {
  return import.meta.env.DEV && localStorage.getItem("dev_mode") === "true";
}
