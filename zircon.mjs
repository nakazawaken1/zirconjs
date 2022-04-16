/*
[BNF] {} 0回以上, [] 0または1回, | または, ^ それ以外
program: {space} expression {{space} expression} {space}
expression: term {{space} ('+'|'-') {space} term}
term: sign {{space} ('*'|'/'|'%') {space} sign}
sign: {'-'|'+'} {space} factor
factor: number
  | '(' {space} expression {space} ')'
  | '?' {space} expression
  | symbol
  | symbol {space} ':' {space} expression
  | 'do' {space} argument {space} block [{space} tuple]
argument: symbol {(space|',') symbol}
block: '{' program '}'
tuple: '(' {space} [expression {(space|',') expression}] {space} ')'
symbol: ^number|mark|space^ {symbol|number}
number: ('0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9') {number}
mark: ('!' | '"' | '#' | '$' | '%' | '&' | '\'' | '(' | ')' | '-' | '=' | '^' | '~' | '\\' | '|' | '@' | '`' | '[' | '{' | ':' | '+' | '*' | ']' | '}' | ',' | '<' | '.' | '>' | '/' | '?' | '_') {mark}
space: (blank|newline) {space}
blank: (' ' | '　' | '\t') {blank}
newline: ('\n' | ';') {newline}
*/
export default {
  parse(source) {
    const BLANK = [' ', '　', "\t"]
    const NEWLINE = ["\n", ';']
    const SPACE = BLANK.concat(NEWLINE)
    const SPACE_COMMA = SPACE.concat([','])
    const DIGIT = '0123456789'.split('')
    const MARK = ['!', '"', '#', '$', '%', '&', "\'", '(', ')', '-', '=', '^', '~', "\\", ',', '@', '`', '[', '{', ':', '+', '*', ']', '}', ',', '<', '.', '>', '/', '?']
    const DIGIT_MARK_SPACE = DIGIT.concat(MARK).concat(SPACE)
    const ADD = ['+', '-']
    const MUL = ['*', '/', '%']
    const notFound = expect => `${expect}が見つかりません`
    let position = 0
    try {
      return program()
    } catch (e) {
      return e + '(' + (position + 1) + '文字目)'
    }

    function log(value, name) {
      console.log(position + ': ' + (name ? name + '=' : '') + JSON.stringify(value))
      return value
    }
    function peek() {
      if (position >= source.length) {
        return "\0"
      }
      const letter = source.charAt(position)
      return letter
    }
    function next() {
      position++
    }
    function skip(letters = SPACE, ifEmpty = null, not = false) {
      const result = []
      while (true) {
        const letter = peek()
        if (not) { if (letter == '\0' || letters.includes(letter)) break }
        else { if (!letters.includes(letter)) break }
        result.push(letter)
        next()
      }
      if (ifEmpty && result.length <= 0) throw ifEmpty
      return result.join('')
    }
    function eat(word, must = false) {
      const start = position
      for (const letter of word.split('')) {
        if (peek() != letter) {
          if (must) throw notFound(word)
          position = start
          return null
        }
        next()
      }
      return word
    }

    function program() {
      skip()
      const result = ['run', expression()]
      while (true) {
        skip()
        if ("\0}".includes(peek())) break
        result.push(expression())
      }
      skip()
      return result
    }
    function expression() {
      let result = term()
      skip()
      while (true) {
        const operator = peek()
        if (!ADD.includes(operator)) break
        next()
        skip()
        result = [operator, result, term()]
      }
      return log(result, 'expression')
    }
    function term() {
      let result = sign()
      skip()
      while (true) {
        const operator = peek()
        if (!MUL.includes(operator)) break
        next()
        skip()
        result = [operator, result, sign()]
      }
      return log(result, 'term')
    }
    function sign() {
      switch (peek()) {
        case '+':
          next()
          skip()
          return log(['+', factor()], 'sign')
        case '-':
          next()
          skip()
          return log(['-', factor()], 'sign')
        default:
          return log(factor(), 'sign')
      }
    }
    function factor() {
      const letter = peek()
      switch (letter) {
        case '?':
          next()
          skip()
          return log(['?', expression()])
        case '(':
          next()
          skip()
          const value = expression()
          skip()
          eat(')', true)
          return log(value, 'factor')
        default:
          if (eat('do')) {
            skip()
            const a = argument()
            skip()
            const b = block()
            return log(['do', a, b], 'factor')
          }
          const n = number(null)
          if (n !== '') return log(n, 'factor')
          const name = symbol()
          skip()
          switch (peek()) {
            case ':':
              next()
              skip()
              return log(['set', name, expression()], 'factor')
            case '(':
              const t = tuple()
              return log(['call', name, t], 'factor')
            default:
              return log(['get', name], 'factor')
          }
      }
    }
    function argument() {
      const symbols = [symbol()]
      while (true) {
        skip(SPACE_COMMA)
        const s = symbol(null)
        if (!s.length) break
        symbols.push(s)
      }
      return log(symbols, 'argument')
    }
    function block() {
      eat('{', true)
      const result = program()
      eat('}', true)
      return log(result, 'block')
    }
    function tuple() {
      eat('(', true)
      skip()
      const result = []
      while (peek() != ')') {
        result.push(expression())
        skip()
        eat(',')
        skip()
      }
      eat(')', true)
      return result
    }
    function symbol(ifEmpty = 'シンボルが見つかりません') {
      const s = skip(DIGIT_MARK_SPACE, ifEmpty, true)
      return log(s, 'symbol')
    }
    function number(ifEmpty = '数値が見つかりません') {
      const n = skip(DIGIT, ifEmpty)
      return log(n.length ? Number(n) : n, 'number')
    }
  },
  run(ast, env) {
    if (ast instanceof Array) {
      const r = i => this.run(i, env)
      function log(value) {
        console.log(JSON.stringify(ast) + ' = ' + JSON.stringify(value))
        return value
      }
      switch (ast[0]) {
        case '+':
          return log(ast.length < 3 ? +r(ast[1]) : r(ast[1]) + r(ast[2]))
        case '-':
          return log(ast.length < 3 ? -r(ast[1]) : r(ast[1]) - r(ast[2]))
        case '*':
          return log(r(ast[1]) * r(ast[2]))
        case '/':
        case '%':
          const right = r(ast[2])
          if (right == 0) throw '0で除算できません'
          const left = r(ast[1])
          return log(ast[0] == '%' ? left % right : left / right)
        case '?': {
          const value = r(ast[1])
          env.out(JSON.stringify(value) + "\n")
          return log(value)
        }
        case 'run': {
          let result
          for (const i of ast.slice(1)) {
            result = r(i)
          }
          return log(result)
        }
        case 'get': {
          const name = r(ast[1])
          if (!(name in env)) throw name + 'は定義されていません'
          return log(env[name])
        }
        case 'set': {
          const value = r(ast[2])
          env[r(ast[1])] = value
          return log(value)
        }
        case 'call': {
          const [_, argument, block] = r(['get', ast[1]])
          const parameter = ast[2]
          const newEnv = { ...env }
          const max = Math.max(argument.length, parameter.length)
          for (let i = 0; i < max; i++) newEnv[argument[i]] = parameter[i]
          console.log(JSON.stringify(newEnv))
          return this.run(block, newEnv)
        }
        case 'do':
          return ast
        default:
          throw ast[0] + 'は定義されていません ' + JSON.stringify(ast)
      }
    }
    return ast
  }
}