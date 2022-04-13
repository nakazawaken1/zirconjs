export const zircon = {
  parse(source) {
    return source
  },
  run(ast, output) {
    output(JSON.stringify(ast))
    return 0
  }
}