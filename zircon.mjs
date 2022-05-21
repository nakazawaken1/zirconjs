/*
[BNF] {} 0回以上, [] 0または1回, | または, ^ それ以外
program: [space] [call] {space call} [space]
call: expression {blank expression} [do]
expression: prefix [blank] factor
  | factor {[blank] operator [blank] factor}
factor: number
  | tuple
  | '?' [space] call
  | '\'' {^'\''^|'\'\''} '\''
  | symbol
  | symbol [space] tuple
  | symbol [space] ':' [space] call
  | do
  | if
do: 'do' ['@' symbol] [space] [argument] [space] block
if: 'if' [space] call [space] block {[space] 'ef' [space] call [space] block} [[space] 'else' [space] block]
prefix: '+' | '-' | 'not'
operator: '+' | '-' | '*' | '/' | '%' | '<' | '<=' | '=' | '<>' | '>=' | '>' | 'and' | 'or' | '^' | '??' | '&' | '??&' | '.' | '?.' | '..' | '|.' | '|?.'
argument: symbol ['@' symbol] {(space|',') [space] symbol ['@' symbol]}
block: '{' program '}'
tuple: '(' [space] [call] {(space|',') [space] call} [space] ')'
symbol: 'true' | 'false' | 'null' | (^number|mark|space^ [symbol|number])
number: digit ['.' digit]
digit: ('0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9') [digit]
mark: ('!' | '"' | '#' | '$' | '%' | '&' | '\'' | '(' | ')' | '-' | '=' | '^' | '~' | '\\' | '|' | '@' | '`' | '[' | '{' | ';' | '+' | ':' | '*' | ']' | '}' | ',' | '<' | '.' | '>' | '/' | '?') [mark]
space: (blank|newline) [space]
blank: (' ' | '　' | '\t') [blank]
newline: ('\n' | ';') [newline]
*/
const toJSON = (a, space = '  ') => JSON.stringify(a, null, space)
const toString = a => a[0] == 'tuple' ? toJSON(a.slice(1), null) : a
const isNumber = (value) => typeof value == 'number' && isFinite(value)
export default {
  toJSON,
  parse(source) {
    const BLANK = [' ', '　', "\t"]
    const NEWLINE = ["\n", ';']
    const SPACE = BLANK.concat(NEWLINE)
    const SPACE_COMMA = SPACE.concat([','])
    const DIGIT = '0123456789'.split('')
    const MARK = ['!', '"', '#', '$', '%', '&', "\'", '(', ')', '-', '=', '^', '~', "\\", '|', '@', '`', '[', '{', ';', '+', ':', '*', ']', '}', ',', '<', '.', '>', '/', '?']
    const MARK_SPACE = MARK.concat(SPACE)
    const DIGIT_MARK_SPACE = MARK_SPACE.concat(DIGIT)
    const OPERATOR = [/*\b 後置, \f 前置, \n 無結合, \r 右結合 */
      ['.', '?.'],
      ['??'],
      ['\f+', '\f-'],
      ['\r^'],
      ['*', '/', '%', '/%'],
      ['+', '-', '&', '??&'],
      ['..'],
      ['\n<', '\n<=', '\n=', '\n<>', '\n>=', '\n>'],
      ['\fnot'],
      ['and'],
      ['or'],
      ['|.', '|?.'],
    ].flatMap((a, i) => a.map(c => [c.replace(/[\r\n\f\b]/, ''), -i, c[0]])).sort((x, y) => y[0].length - x[0].length)
    console.log(OPERATOR)
    const notFound = expect => `${expect}が見つかりません`
    let position = 0
    try {
      return program({})
    } catch (e) {
      let center = position;
      if (source.length < 5) {
        center += 5
        source = '\\\\\\\\\\' + source + '\\\\\\\\\\'
      }
      return e + '(' + (position + 1) + '文字目 ' + source.slice(center - 2, center + 3) + ')'
    }

    function log(value, name) {
      console.log(position + ': ' + (name ? name + '=' : '') + toJSON(value))
      return value
    }
    function peek(offset = 0) {
      if (position + offset >= source.length) {
        return "\0"
      }
      const letter = source.charAt(position + offset)
      return letter
    }
    function next() {
      position++
    }
    function skip(letters = SPACE, ifEmpty = null, second = null) {
      const result = []
      while (true) {
        const letter = peek()
        if (second) { if (letter == '\0' || (result.length ? second : letters).includes(letter)) break }
        else { if (!letters.includes(letter)) break }
        result.push(letter)
        next()
      }
      if (ifEmpty && result.length <= 0) throw ifEmpty
      return result.join('')
    }
    function eat(word, required = false) {
      const start = position
      for (const letter of word.split('')) {
        if (peek() != letter) {
          if (required) throw notFound(word)
          position = start
          return null
        }
        next()
      }
      return word
    }

    function program(env) {
      const result = ['run', env]
      while (true) {
        skip()
        if ("\0}".includes(peek())) break
        result.push(call(env))
      }
      skip()
      return log(result, 'program')
    }
    function call(env) {
      const queue = [expression(env)]
      while (true) {
        skip(BLANK)
        const backup = position
        try {
          const a = [expression(env)]
          const d = do_(env)
          if (d) a.push(d)
          queue.unshift(a)
        } catch {
          position = backup
          break
        }
      }
      if (queue.length <= 1) return log(queue[0], 'call')
      return log(queue.reduce(([p, d], c) => {
        const argument = p && p[0] == 'tuple' ? p.slice(1) : [p]
        if (d) argument.push(d)
        return ['call', c, argument]
      }), 'call')
    }
    function expression(env) {
      const stack = []
      let right
      while (true) {
        const backup = position
        const unary = eatOperator(i => i[2] == '\f')
        if (unary != null) {
          const top = stack[stack.length - 1]
          if (stack.length && top[1] > unary[1]) {
            position = backup
            right = call(env)
            break
          }
          stack.push(unary)
          continue
        }
        skip(BLANK)
        right = factor(env)
        const binary = eatOperator(i => !'\f\b'.includes(i[2]))
        if (binary == null) break
        while (stack.length) {
          const top = stack[stack.length - 1]
          const compare = top[1] - binary[1]
          if (compare < 0) break
          const type = top[2]
          if (type == '\f') {
            stack.pop()
            right = log([top[0], right], 'expression')
          } else if (type == '\n' && binary[2] == '\n') {
            throw binary[0] + 'は複数連結できません'
          } else if (compare == 0 && type != top[0][0]) {
            break
          } else {
            stack.pop()
            right = log([top[0], stack.pop(), right], 'expression')
          }
        }
        stack.push(right)
        stack.push(binary)
      }
      while (stack.length) {
        const top = stack.pop()
        if (top[2] == '\f') right = log([top[0], right], 'expression')
        else right = log([top[0], stack.pop(), right], 'expression')
      }
      return log(right, 'expression')

      function eatOperator(filter = i => true) {
        skip(BLANK)
        const backup = position
        return OPERATOR.find(i => {
          if (eat(i[0]) && filter(i)) return true
          position = backup
          return false
        })
      }
    }
    function factor(env) {
      switch (peek()) {
        case '?':
          next()
          skip()
          return log(['?', call(env)], 'factor')
        case '(':
          const value = tuple(env)
          return log(value.length == 2 ? value[1] : value, 'factor')
        case '\'': {
          next()
          const letters = []
          while (true) {
            const letter = peek()
            if (letter == '\'') {
              if (peek(1) != '\'') break
              next()
            }
            next()
            letters.push(letter)
          }
          eat('\'', true)
          return log(letters.join(''), 'factor')
        }
        default: {
          const d = do_(env)
          if (d) return log(d, 'factor')
          if (eat('if')) {
            const ifs = ['if']
            skip()
            ifs.push(call(env))
            skip()
            ifs.push(block(env))
            skip()
            while (eat('ef')) {
              skip()
              ifs.push(call(env))
              skip()
              ifs.push(block(env))
            }
            skip()
            if (eat('else')) {
              skip()
              ifs.push(block(env))
            }
            return log(ifs, 'factor')
          }
          const n = number(null)
          if (n !== '') return log(n, 'factor')
          const name = symbol()
          skip(BLANK)
          switch (peek()) {
            case ':':
              next()
              skip(BLANK)
              return log(['set', name, call(env)], 'factor')
            case '(':
              const argument = tuple(env).slice(1)
              return log(['call', ['get', name], argument], 'factor')
            default:
              return log(['get', name], 'factor')
          }
        }
      }
    }
    function do_(env) {
      if (!eat('do')) return null
      skip()
      const type = []
      if(eat('@')) {
        type.push(symbol())
        skip()
      }
      const a = peek() != '{' ? argument(env) : []
      skip()
      const b = block(env)
      return log(['do', a, b].concat(type), 'do')
    }
    function argument(env) {
      const symbols = []
      while (true) {
        const s = symbol(null)
        if (!s.length) break
        if (eat('@')) {
          symbols.push([s, symbol()])
        } else {
          symbols.push(s)
        }
        skip(SPACE_COMMA)
      }
      return log(symbols, 'argument')
    }
    function block(env) {
      eat('{', true)
      const result = program({ $: env, toJSON() { return '<' + Object.keys(this).filter(i => !['toJSON', '$'].includes(i)).join(',') + '>' } })
      eat('}', true)
      return log(result, 'block')
    }
    function tuple(env) {
      eat('(', true)
      skip()
      const result = ['tuple']
      while (peek() != ')') {
        result.push(call(env))
        skip()
        eat(',')
        skip()
      }
      eat(')', true)
      return result
    }
    function symbol(ifEmpty = 'シンボルが見つかりません') {
      const s = skip(DIGIT_MARK_SPACE, ifEmpty, MARK_SPACE)
      return log(s, 'symbol')
    }
    function number(ifEmpty = '数値が見つかりません') {
      const n = skip(DIGIT, ifEmpty)
      if (peek() == '.' && DIGIT.includes(peek(1))) {
        next()
        const m = skip(DIGIT, ifEmpty)
        return log(Number(n + '.' + m), 'number')
      }
      return log(n.length ? Number(n) : n, 'number')
    }
  },
  run(ast, env = {}) {
    const type = a => {
      if (a == null) return 'Null'
      if (a === true || a === false) return 'Boolean'
      if (a[0] == 'tuple') return 'Tuple'
      if (a[0] == 'range') return 'Range'
      if (a[0] == 'do') return 'Do'
      if (typeof a == 'string') return 'String'
      if (isNumber(a)) return String(a).includes('.') ? 'Real' : 'Integer'
      return 'Any'
    }
    env.$ = {
      type,
      print: a => env.out(toString(a)),
      echo: a => env.out(toString(a) + '\n')
    }
    ast[1].$ = env
    const result = evaluate(ast, ast[1])
    return result && result[0] == 'tuple' ? result.slice(1) : result

    function evaluate(ast, env) {
      if (ast instanceof Array) {
        const r = i => evaluate(i, env)
        const types = {
          Tuple: {
            '.': (left, right) => left.slice(1)[right < 0 ? left.length - 1 + right : right] || null
          },
          Range: {
            '()': (range, action) => {
              for (var i = range[1], end = range[2]; i <= end; i++) {
                r(['call', action, [i]])
              }
            }
          }
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
          case '/%': {
            const right = r(ast[2])
            if (right == 0) throw '0で除算できません'
            const left = r(ast[1])
            switch (ast[0]) {
              case '/': return log(left / right)
              case '%': return log(left % right)
              case '/%': return log(Math.floor(left / right))
            }
          }
          case '^':
            return log(Math.pow(r(ast[1]), r(ast[2])))
          case '<':
            return log(r(ast[1]) < r(ast[2]))
          case '>':
            return log(r(ast[1]) > r(ast[2]))
          case '<=':
            return log(r(ast[1]) <= r(ast[2]))
          case '>=':
            return log(r(ast[1]) >= r(ast[2]))
          case '=':
            return log(r(ast[1]) === r(ast[2]))
          case '<>':
            return log(r(ast[1]) !== r(ast[2]))
          case 'and':
            return log(r(ast[1]) && r(ast[2]))
          case 'or':
            return log(r(ast[1]) || r(ast[2]))
          case 'not':
            return log(!r(ast[1]))
          case '?': {
            const value = r(ast[1])
            for (var e = env; e != null; e = e.$) {
              if ('out' in e) {
                e.out(toString(value) + "\n")
                return log(value)
              }
            }
            throw '出力先(out)が定義されていません'
          }
          case '??': {
            const value = r(ast[1])
            return log(value == null ? r(ast[2]) : value)
          }
          case '??&': {
            const value = r(ast[1])
            return log(String(value === null || value === '' ? r(ast[2]) : value))
          }
          case '&':
            return log(`${r(ast[1]) ?? ''}${r(ast[2]) ?? ''}`)
          case '..':
            return log(['range', r(ast[1]), r(ast[2])])
          case 'run': {
            let result = null
            for (var i = 2; i < ast.length; i++) result = r(ast[i])
            return log(result)
          }
          case 'get': {
            const name = r(ast[1])
            if (name == 'true') {
              return true
            }
            if (name == 'false') {
              return false
            }
            if (name == 'null') {
              return null
            }
            for (var e = env; e != null; e = e.$) {
              if (name in e) return log(e[name])
            }
            throw name + 'は定義されていません'
          }
          case 'set': {
            const value = r(ast[2])
            env[r(ast[1])] = value
            return log(value)
          }
          case 'call': {
            const f = r(ast[1])
            if (f instanceof Function) return log(f(...ast[2])) // 組み込み関数
            const t = types[type(f)]
            const apply = t && t['()']
            if (apply) return log(r(['call', apply, [f, ...ast[2]]]))
            if (f == null || f[0] != 'do') return log(r(ast[2][0]))
            const [_, argument, block] = f
            const parameter = ast[2]
            const local = block[1]
            const max = Math.max(argument.length, parameter.length)
            for (let i = 0; i < max; i++) {
              console.log(argument[i] + ' <= ' + r(parameter[i]))
              local[argument[i] instanceof Array ? argument[i][0] : argument[i]] = r(parameter[i])
            }
            return evaluate(block, { ...local })
          }
          case 'tuple':
            return log(['tuple', ...ast.slice(1).map(i => r(i))])
          case 'do':
            return ast
          case 'if': {
            const condition = r(ast[1])
            if (condition) return log(r(ast[2]))
            for (let i = 3; i < ast.length; i++) {
              const v = ast[i++]
              if (v[0] && v[0] == 'run') {
                return log(r(v))
              }
              if (r(v)) return log(r(ast[i]))
            }
            return log(null)
          }
          case '.':
          case '?.':
          case '|.':
          case '|?.': {
            const instance = r(ast[1])
            if (instance == null && ast[0].endsWith('?.')) return log(null)
            if (ast[2][0] == 'get') return log(r(['call', ast[2], [instance]]))
            const message = r(ast[2])
            const t = type(instance)
            const f = types[t][ast[0]]
            if (f == null) throw `${t}#${ast[0]}は定義されていません`
            return log(r(['call', f, [instance, message]]))
          }
          default:
            throw ast[0] + 'は定義されていません ' + toJSON(ast)
        }
      }
      return ast

      function log(value) {
        console.log(toJSON(ast) + ' = ' + toJSON(value))
        return value
      }
    }
  }
}