import type {
  JSXElement,
  VariableDeclaration,
  ExportDeclaration,
  Statement,
  ImportDeclaration,
  ObjectPattern,
  Identifier,
  TSInterfaceDeclaration,
} from "@babel/types"

const excludedAttrs = new Set([
  "viewBox",
  "baseFrequency",
  "diffuseConstant",
  "kernelUnitLength",
  "specularExponent",
  "edgeMode",
  "preserveAspectRatio",
  "gradientTransform",
  "patternTransform",
  "attributeName",
  "repeatCount",
  "attributeType",
  "baseFrequency",
  "numOctaves",
  "specularExponent",
  "surfaceScale",
  "href", // SVG 2 href
  "xlinkHref", // `xlink:href`
  "targetX",
  "targetY",
  "textLength",
])

export function jsxAttrCamel2Kebab(jsx: JSXElement) {
  if (jsx.type == "JSXElement") {
    const el = jsx.openingElement
    el.attributes.forEach((attr) => {
      if (attr.type != "JSXAttribute") return
      const name = attr.name
      if (typeof name.name != "string") return
      if (excludedAttrs.has(name.name)) return
      name.name = name.name
        .replace(/([A-Z])/g, "-$1")
        .toLowerCase()
        .replace(/^-/, "")
    })
  }
  for (const child of jsx.children) {
    if (child.type === "JSXElement") {
      jsxAttrCamel2Kebab(child as JSXElement)
    }
  }
  return jsx
}

export interface TemplateVariables {
  componentName: string
  interfaces: TSInterfaceDeclaration[]
  props: (ObjectPattern | Identifier)[]
  imports: ImportDeclaration[]
  exports: (VariableDeclaration | ExportDeclaration | Statement)[]
  jsx: JSXElement
}

export function vueSvgrTemplate(
  variables: TemplateVariables,
  { tpl }: { tpl: Function }
) {
  const jsx = jsxAttrCamel2Kebab(variables.jsx)
  return tpl`
import type { ReservedProps, SVGAttributes } from "vue"
type SVGProps<T> = SVGAttributes & ReservedProps
const ${variables.componentName} = (${variables.props}) => (
  ${jsx}
);

${variables.exports};
`
}
