import type * as luaparse from 'luaparse';

export function walkLuaAst(
  chunk: luaparse.Chunk,
  addError: (message: string, loc?: { start: { line: number; column: number } }) => void
): void {
  // Lexical scope stack: stack of Sets of local variable names
  const scopeStack: Array<Set<string>> = [new Set()];
  const functionNameStack: Array<string | undefined> = [];

  function pushScope(): void {
    scopeStack.push(new Set());
  }

  function popScope(): void {
    if (scopeStack.length > 1) {
      scopeStack.pop();
    }
  }

  function declareLocal(name: string): void {
    scopeStack[scopeStack.length - 1]!.add(name);
  }

  function isDeclaredLocal(name: string): boolean {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      if (scopeStack[i]!.has(name)) {
        return true;
      }
    }
    return false;
  }

  function currentFunctionName(): string | undefined {
    for (let i = functionNameStack.length - 1; i >= 0; i--) {
      if (functionNameStack[i] !== undefined) {
        return functionNameStack[i];
      }
    }
    return undefined;
  }

  function checkIdentifier(node: luaparse.Identifier): void {
    if (node.name === 'setfenv' || node.name === 'getfenv') {
      addError(`Forbidden use of "${node.name}" (05 §3)`, node.loc);
    }
    if (node.name === 'goto') {
      addError(`Forbidden use of "goto" (05 §3)`, node.loc);
    }
    if (node.name.includes('GiveOrder')) {
      const fn = currentFunctionName();
      if (!fn || !fn.startsWith('assist')) {
        addError(
          `Identifier "${node.name}" containing GiveOrder is only allowed inside functions starting with "assist" (05 §3, M09)`,
          node.loc
        );
      }
    }
  }

  function checkMemberExpression(node: luaparse.MemberExpression): void {
    if (node.base.type === 'Identifier') {
      const baseName = node.base.name;
      const propName = node.identifier.name;
      if (baseName === 'io' && propName === 'popen') {
        addError(`Forbidden use of "io.popen" (05 §3)`, node.loc);
      }
      if (baseName === 'os' && propName === 'execute') {
        addError(`Forbidden use of "os.execute" (05 §3)`, node.loc);
      }
    }
  }

  function visitNode(node: luaparse.Node | null | undefined): void {
    if (!node) return;

    switch (node.type) {
      case 'Chunk': {
        for (const stmt of node.body) {
          visitNode(stmt);
        }
        break;
      }

      case 'LocalStatement': {
        for (const init of node.init) {
          visitNode(init);
        }
        for (const v of node.variables) {
          declareLocal(v.name);
        }
        break;
      }

      case 'AssignmentStatement': {
        for (const init of node.init) {
          visitNode(init);
        }
        for (const target of node.variables) {
          if (target.type === 'Identifier') {
            if (target.name !== 'widget' && !isDeclaredLocal(target.name)) {
              addError(
                `Assignment to undeclared global variable "${target.name}" is forbidden (05 §3)`,
                target.loc
              );
            }
          } else {
            visitNode(target);
          }
        }
        break;
      }

      case 'FunctionDeclaration': {
        let funcName: string | undefined;

        if (node.isLocal) {
          if (node.identifier && node.identifier.type === 'Identifier') {
            declareLocal(node.identifier.name);
            funcName = node.identifier.name;
          }
        } else if (node.identifier) {
          if (node.identifier.type === 'Identifier') {
            if (node.identifier.name !== 'widget' && !isDeclaredLocal(node.identifier.name)) {
              addError(
                `Global function declaration "${node.identifier.name}" is forbidden; use local function (05 §3)`,
                node.identifier.loc
              );
            }
            funcName = node.identifier.name;
          } else if (node.identifier.type === 'MemberExpression') {
            funcName = node.identifier.identifier.name;
            visitNode(node.identifier.base);
          }
        }

        pushScope();
        functionNameStack.push(funcName);

        if (
          node.identifier &&
          node.identifier.type === 'MemberExpression' &&
          node.identifier.indexer === ':'
        ) {
          declareLocal('self');
        }

        for (const param of node.parameters) {
          if (param.type === 'Identifier') {
            declareLocal(param.name);
          }
        }

        for (const stmt of node.body) {
          visitNode(stmt);
        }

        functionNameStack.pop();
        popScope();
        break;
      }

      case 'ForNumericStatement': {
        visitNode(node.start);
        visitNode(node.end);
        visitNode(node.step);

        pushScope();
        declareLocal(node.variable.name);
        for (const stmt of node.body) {
          visitNode(stmt);
        }
        popScope();
        break;
      }

      case 'ForGenericStatement': {
        for (const iter of node.iterators) {
          visitNode(iter);
        }

        pushScope();
        for (const v of node.variables) {
          declareLocal(v.name);
        }
        for (const stmt of node.body) {
          visitNode(stmt);
        }
        popScope();
        break;
      }

      case 'DoStatement':
      case 'RepeatStatement': {
        pushScope();
        for (const stmt of node.body) {
          visitNode(stmt);
        }
        popScope();
        if ('condition' in node) {
          visitNode(node.condition);
        }
        break;
      }

      case 'WhileStatement': {
        visitNode(node.condition);
        pushScope();
        for (const stmt of node.body) {
          visitNode(stmt);
        }
        popScope();
        break;
      }

      case 'IfStatement': {
        for (const clause of node.clauses) {
          if ('condition' in clause) {
            visitNode(clause.condition);
          }
          pushScope();
          for (const stmt of clause.body) {
            visitNode(stmt);
          }
          popScope();
        }
        break;
      }

      case 'ReturnStatement': {
        for (const arg of node.arguments) {
          visitNode(arg);
        }
        break;
      }

      case 'CallStatement': {
        visitNode(node.expression);
        break;
      }

      case 'CallExpression': {
        visitNode(node.base);
        for (const arg of node.arguments) {
          visitNode(arg);
        }
        break;
      }

      case 'StringCallExpression': {
        visitNode(node.base);
        visitNode(node.argument);
        break;
      }

      case 'TableCallExpression': {
        visitNode(node.base);
        visitNode(node.arguments);
        break;
      }

      case 'MemberExpression': {
        checkMemberExpression(node);
        visitNode(node.base);
        checkIdentifier(node.identifier);
        break;
      }

      case 'IndexExpression': {
        visitNode(node.base);
        visitNode(node.index);
        break;
      }

      case 'UnaryExpression': {
        visitNode(node.argument);
        break;
      }

      case 'BinaryExpression':
      case 'LogicalExpression': {
        visitNode(node.left);
        visitNode(node.right);
        break;
      }

      case 'TableConstructorExpression': {
        for (const field of node.fields) {
          visitNode(field);
        }
        break;
      }

      case 'TableKey': {
        visitNode(node.key);
        visitNode(node.value);
        break;
      }

      case 'TableKeyString': {
        checkIdentifier(node.key);
        visitNode(node.value);
        break;
      }

      case 'TableValue': {
        visitNode(node.value);
        break;
      }

      case 'Identifier': {
        checkIdentifier(node);
        break;
      }

      case 'GotoStatement': {
        addError('Forbidden use of "goto" (05 §3)', node.loc);
        break;
      }

      default:
        break;
    }
  }

  visitNode(chunk);
}
