/*
[BNF]
program: {space} expression {{space} expression} {space}
expression: term {{space} ('+'|'-') {space} term}
term: sign {{space} ('*'|'/'|'%') {space} sign}
sign: {'-'|'+'} {space} factor
factor: number | '(' {space} expression {space} ')' | 'p' expression
number: ('0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9') {number}
space: (blank|newline) {space}
blank: (' ' | '　' | '\t') {blank}
newline: ('\n' | ';') {newline}
*/
export default {
  parse(source) {
    const BLANK = [' ', '　', "\t"]
    const NEWLINE = ["\n", ';']
    const SPACE = BLANK.concat(NEWLINE)
    const DIGIT = '0123456789'.split('')
    const ADD = ['+', '-']
    const MUL = ['*', '/', '%']
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
    function skip(letters = SPACE, ifEmpty = null) {
      const result = []
      while (true) {
        const letter = peek()
        if (!letters.includes(letter)) break
        result.push(letter)
        next()
      }
      if (ifEmpty && result.length <= 0) throw ifEmpty
      return result.join('')
    }

    function program() {
      skip()
      const result = ['run', expression()]
      while (true) {
        skip()
        if (peek() == "\0") break
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
      switch (peek()) {
        case 'p':
          next()
          skip()
          return log(['p', expression()])
        case '(':
          next()
          skip()
          const value = expression()
          skip()
          if (peek() != ')') throw '「)」が見つかりません'
          next()
          return log(value, 'factor')
        default:
          return log(number(), 'factor')
      }
    }
    function number() {
      const n = skip(DIGIT, '数値が見つかりません')
      return log(Number(n), 'number')
    }
  },
  run(ast, env) {
    const run_ = i => this.run(i, env)
    function log(value) {
      console.log(JSON.stringify(ast) + ' = ' + JSON.stringify(value))
      return value
    }
    if (ast instanceof Array) {
      switch (ast[0]) {
        case '+':
          return log(ast.length < 3 ? +run_(ast[1]) : run_(ast[1]) + run_(ast[2]))
        case '-':
          return log(ast.length < 3 ? -run_(ast[1]) : run_(ast[1]) - run_(ast[2]))
        case '*':
          return log(run_(ast[1]) * run_(ast[2]))
        case '/':
        case '%':
          const right = run_(ast[2])
          if (right == 0) throw '0で除算できません'
          const left = run_(ast[1])
          return log(ast[0] == '%' ? left % right : left / right)
        case 'p':
          const value = run_(ast[1])
          env.out(JSON.stringify(value) + "\n")
          return log(value)
        case 'run':
          let result
          for (const i of ast.slice(1)) {
            result = run_(i)
          }
          return log(result)
        default:
          throw ast[0] + 'は定義されていません'
      }
    }
    return ast
  }
}