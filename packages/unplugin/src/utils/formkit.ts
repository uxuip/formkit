import type { ComponentUse, Traverse } from '../types'
import type {
  ObjectExpression,
  ObjectProperty,
  StringLiteral,
  ArrayExpression,
  Program,
  File,
} from '@babel/types'
import { addImport, createProperty } from './ast'
import t from '@babel/template'
import { consola } from 'consola'

/**
 * Given a component, create a config object that can be used to configure it.
 * @param component - The component to create a config object for.
 */
export function createConfigObject(component: ComponentUse): ObjectExpression {
  const config = t.expression.ast`{}` as ObjectExpression

  const bindingsVar = addImport(component.traverse, component.root, {
    from: '@formkit/vue',
    name: 'bindings',
  })
  const plugins = t.expression.ast`[${bindingsVar}]` as ArrayExpression
  if (component.from === '@formkit/vue' && component.name === 'FormKit') {
    // This is an actual FormKit component, so we should inject the type.
  }
  config.properties.push(createProperty('plugins', plugins))
  const props = component.path.node.arguments[1] as ObjectExpression
  // Perform a direct-injection on the input type (if possible)
  importInputType(component, props, plugins)
  return config
}

function importInputType(
  component: ComponentUse,
  props: ObjectExpression,
  plugins: ArrayExpression
): void {
  const inputType = props.properties.find(
    (prop) =>
      prop.type === 'ObjectProperty' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === 'type'
  ) as ObjectProperty | undefined

  let libName: string
  // Perform an optimized import, directly replacing the type property if possible.
  if (!inputType || inputType.value.type === 'StringLiteral') {
    const value = inputType ? (inputType.value as StringLiteral).value : 'text'
    libName = addImport(component.traverse, component.root, {
      from: 'virtual:formkit/inputs:' + value,
      name: 'library',
    })
  } else {
    consola.warn(
      '[FormKit de-opt]: Input uses bound type prop, skipping optimization.'
    )
    libName = addImport(component.traverse, component.root, {
      from: 'virtual:formkit/library',
      name: 'library',
    })
  }
  plugins.elements.push(t.expression.ast`${libName}`)
}

export function getConfigProperty(
  traverse: Traverse,
  configAst: Program | File,
  name: string
) {
  traverse(configAst, {
    CallExpression(path) {
      if (
        path.node.callee.type === 'Identifier' &&
        path.node.callee.name === 'defineFormKitConfig'
      ) {
        const [config] = path.node.arguments
        if (config.type === 'ObjectExpression') {
          const prop = config.properties.find(
            (prop) =>
              prop.type === 'ObjectProperty' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === name
          )
          if (prop) {
            return prop
          }
        } else {
          consola.warn(
            '[FormKit de-opt] call defineFormKitConfig with an object literal to enable optimizations.'
          )
        }
      }
    },
  })
}

export function createInputConfig(
  inputName: string,
  traverse: Traverse,
  configAst?: Program | File
): string {
  if (!configAst) {
    return `import { ${inputName} } from '@formkit/inputs';
    const library = () => {};
    library.library = (node) => node.define(${inputName});
    export { library };`
  }
  // const inputsProperty = getConfigProperty(traverse, configAst, 'inputs')
}
