// tslint:disable:no-console

import * as commander from "commander";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

// Default suffix appended to generated files. Abbreviation for "ts-interface".
const defaultSuffix = "-ti";
// Default header prepended to the generated module.
const defaultHeader =
`/**
 * This module was automatically generated by \`ts-interface-builder\`
 */
`;

// The main public interface is `Compiler.compile`.
export class Compiler {
  public static compile(filePath: string): string {
    const options = {target: ts.ScriptTarget.Latest, module: ts.ModuleKind.CommonJS};
    const program = ts.createProgram([filePath], options);
    const checker = program.getTypeChecker();
    const topNode = program.getSourceFile(filePath);
    if (!topNode) {
      throw new Error(`Can't process ${filePath}: ${collectDiagnostics(program)}`);
    }
    return new Compiler(checker).compileNode(topNode);
  }

  private exportedNames: string[] = [];

  constructor(private checker: ts.TypeChecker) {}

  private getName(id: ts.Node): string {
    const symbol = this.checker.getSymbolAtLocation(id);
    return symbol ? symbol.getName() : "unknown";
  }

  private indent(content: string): string {
    return content.replace(/\n/g, "\n  ");
  }

  private compileNode(node: ts.Node): string {
    switch (node.kind) {
      case ts.SyntaxKind.Identifier: return this._compileIdentifier(node as ts.Identifier);
      case ts.SyntaxKind.Parameter: return this._compileParameterDeclaration(node as ts.ParameterDeclaration);
      case ts.SyntaxKind.PropertySignature: return this._compilePropertySignature(node as ts.PropertySignature);
      case ts.SyntaxKind.MethodSignature: return this._compileMethodSignature(node as ts.MethodSignature);
      case ts.SyntaxKind.TypeReference: return this._compileTypeReferenceNode(node as ts.TypeReferenceNode);
      case ts.SyntaxKind.FunctionType: return this._compileFunctionTypeNode(node as ts.FunctionTypeNode);
      case ts.SyntaxKind.TypeLiteral: return this._compileTypeLiteralNode(node as ts.TypeLiteralNode);
      case ts.SyntaxKind.ArrayType: return this._compileArrayTypeNode(node as ts.ArrayTypeNode);
      case ts.SyntaxKind.TupleType: return this._compileTupleTypeNode(node as ts.TupleTypeNode);
      case ts.SyntaxKind.UnionType: return this._compileUnionTypeNode(node as ts.UnionTypeNode);
      case ts.SyntaxKind.LiteralType: return this._compileLiteralTypeNode(node as ts.LiteralTypeNode);
      case ts.SyntaxKind.InterfaceDeclaration:
        return this._compileInterfaceDeclaration(node as ts.InterfaceDeclaration);
      case ts.SyntaxKind.TypeAliasDeclaration:
        return this._compileTypeAliasDeclaration(node as ts.TypeAliasDeclaration);
      case ts.SyntaxKind.ExpressionWithTypeArguments:
        return this._compileExpressionWithTypeArguments(node as ts.ExpressionWithTypeArguments);
      case ts.SyntaxKind.ParenthesizedType:
        return this._compileParenthesizedTypeNode(node as ts.ParenthesizedTypeNode);
      case ts.SyntaxKind.SourceFile: return this._compileSourceFile(node as ts.SourceFile);
      case ts.SyntaxKind.AnyKeyword: return '"any"';
      case ts.SyntaxKind.NumberKeyword: return '"number"';
      case ts.SyntaxKind.ObjectKeyword: return '"object"';
      case ts.SyntaxKind.BooleanKeyword: return '"boolean"';
      case ts.SyntaxKind.StringKeyword: return '"string"';
      case ts.SyntaxKind.SymbolKeyword: return '"symbol"';
      case ts.SyntaxKind.ThisKeyword: return '"this"';
      case ts.SyntaxKind.VoidKeyword: return '"void"';
      case ts.SyntaxKind.UndefinedKeyword: return '"undefined"';
      case ts.SyntaxKind.NullKeyword: return '"null"';
      case ts.SyntaxKind.NeverKeyword: return '"never"';
    }
    // Skip top-level statements that we haven't handled.
    if (ts.isSourceFile(node.parent!)) { return ""; }
    throw new Error(`Node ${ts.SyntaxKind[node.kind]} not supported by ts-interface-builder: ` +
      node.getText());
  }

  private compileOptType(typeNode: ts.Node|undefined): string {
    return typeNode ? this.compileNode(typeNode) : '"any"';
  }

  private _compileIdentifier(node: ts.Identifier): string {
    return `"${node.getText()}"`;
  }
  private _compileParameterDeclaration(node: ts.ParameterDeclaration): string {
    const name = this.getName(node.name);
    const isOpt = node.questionToken ? ", true" : "";
    return `t.param("${name}", ${this.compileOptType(node.type)}${isOpt})`;
  }
  private _compilePropertySignature(node: ts.PropertySignature): string {
    const name = this.getName(node.name);
    const prop = this.compileOptType(node.type);
    const value = node.questionToken ? `t.opt(${prop})` : prop;
    return `"${name}": ${value}`;
  }
  private _compileMethodSignature(node: ts.MethodSignature): string {
    const name = this.getName(node.name);
    const params = node.parameters.map(this.compileNode, this);
    const items = [this.compileOptType(node.type)].concat(params);
    return `"${name}": t.func(${items.join(", ")})`;
  }
  private _compileTypeReferenceNode(node: ts.TypeReferenceNode): string {
    if (!node.typeArguments) {
      return `"${node.typeName.getText()}"`;
    } else if (node.typeName.getText() === "Promise") {
      // Unwrap Promises.
      return this.compileNode(node.typeArguments[0]);
    } else {
      throw new Error(`Generics are not yet supported by ts-interface-builder: ` + node.getText());
    }
  }
  private _compileFunctionTypeNode(node: ts.FunctionTypeNode): string {
    const params = node.parameters.map(this.compileNode, this);
    const items = [this.compileOptType(node.type)].concat(params);
    return `t.func(${items.join(", ")})`;
  }
  private _compileTypeLiteralNode(node: ts.TypeLiteralNode): string {
    const members = node.members.map((n) => "  " + this.indent(this.compileNode(n)) + ",\n");
    return `t.iface([], {\n${members.join("")}})`;
  }
  private _compileArrayTypeNode(node: ts.ArrayTypeNode): string {
    return `t.array(${this.compileNode(node.elementType)})`;
  }
  private _compileTupleTypeNode(node: ts.TupleTypeNode): string {
    const members = node.elementTypes.map(this.compileNode, this);
    return `t.tuple(${members.join(", ")})`;
  }
  private _compileUnionTypeNode(node: ts.UnionTypeNode): string {
    const members = node.types.map(this.compileNode, this);
    return `t.union(${members.join(", ")})`;
  }
  private _compileLiteralTypeNode(node: ts.LiteralTypeNode): string {
    return `t.lit(${node.getText()})`;
  }
  private _compileInterfaceDeclaration(node: ts.InterfaceDeclaration): string {
    const name = this.getName(node.name);
    const members = node.members.map((n) => "  " + this.indent(this.compileNode(n)) + ",\n");
    const extend: string[] = [];
    if (node.heritageClauses) {
      for (const h of node.heritageClauses) {
        extend.push(...h.types.map(this.compileNode, this));
      }
    }
    this.exportedNames.push(name);
    return `export const ${name} = t.iface([${extend.join(", ")}], {\n${members.join("")}});`;
  }
  private _compileTypeAliasDeclaration(node: ts.TypeAliasDeclaration): string {
    const name = this.getName(node.name);
    this.exportedNames.push(name);
    return `export const ${name} = ${this.compileNode(node.type)};`;
  }
  private _compileExpressionWithTypeArguments(node: ts.ExpressionWithTypeArguments): string {
    return this.compileNode(node.expression);
  }
  private _compileParenthesizedTypeNode(node: ts.ParenthesizedTypeNode): string {
    return this.compileNode(node.type);
  }
  private _compileSourceFile(node: ts.SourceFile): string {
    const prefix = `import * as t from "ts-interface-checker";\n` +
                   "// tslint:disable:object-literal-key-quotes\n\n";
    return prefix +
      node.statements.map(this.compileNode, this).filter((s) => s).join("\n\n") + "\n\n" +
      "const exportedTypeSuite: t.ITypeSuite = {\n" +
      this.exportedNames.map((n) => `  ${n},\n`).join("") +
      "};\n" +
      "export default exportedTypeSuite;\n";
  }
}

function collectDiagnostics(program: ts.Program) {
  const diagnostics = ts.getPreEmitDiagnostics(program);
  return ts.formatDiagnostics(diagnostics, {
    getCurrentDirectory() { return process.cwd(); },
    getCanonicalFileName(fileName: string) { return fileName; },
    getNewLine() { return "\n"; },
  });
}

/**
 * Main entry point when used from the command line.
 */
export function main() {
  commander
  .description("Create runtime validator module from TypeScript interfaces")
  .usage("[options] <typescript-file...>")
  .option("-s, --suffix <suffix>", `Suffix to append to generated files (default ${defaultSuffix})`, defaultSuffix)
  .option("-o, --outDir <path>", `Directory for output files; same as source file if omitted`)
  .option("-v, --verbose", "Produce verbose output")
  .parse(process.argv);

  const files: string[] = commander.args;
  const verbose: boolean = commander.verbose;
  const suffix: string = commander.suffix;
  const outDir: string|undefined = commander.outDir;

  if (files.length === 0) {
    commander.outputHelp();
    process.exit(1);
    return;
  }

  for (const filePath of files) {
    // Read and parse the source file.
    const ext = path.extname(filePath);
    const dir = outDir || path.dirname(filePath);
    const outPath = path.join(dir, path.basename(filePath, ext) + suffix + ".ts");
    if (verbose) {
      console.log(`Compiling ${filePath} -> ${outPath}`);
    }
    const generatedCode = defaultHeader + Compiler.compile(filePath);
    fs.writeFileSync(outPath, generatedCode);
  }
}
