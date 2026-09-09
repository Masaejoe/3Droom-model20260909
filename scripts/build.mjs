// Let native Vite workers finish closing before the CLI forces process exit.
// Windows ARM64 can otherwise assert in libuv after a successful export.
const cli = new URL('../node_modules/vinext/dist/cli.js', import.meta.url).href;
const exit = process.exit.bind(process);
if (process.platform === 'win32') {
  process.exit = (code = 0) => {
    if (Number(code) !== 0) return exit(code);
    setTimeout(() => exit(code), 750);
  };
}
process.argv = [process.execPath, new URL(cli).pathname, 'build'];
await import(cli);

