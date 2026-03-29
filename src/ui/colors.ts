const enabled = !process.env.NO_COLOR && process.stderr.isTTY !== false;

const code = (open: number, close: number) => {
  if (!enabled) return (s: string) => s;
  return (s: string) => `\x1b[${open}m${s}\x1b[${close}m`;
};

export const bold = code(1, 22);
export const dim = code(2, 22);
export const italic = code(3, 23);
export const red = code(31, 39);
export const green = code(32, 39);
export const yellow = code(33, 39);
export const blue = code(34, 39);
export const magenta = code(35, 39);
export const cyan = code(36, 39);
export const gray = code(90, 39);
export const white = code(97, 39);

export const bgRed = code(41, 49);
export const bgGreen = code(42, 49);
