import * as vscode from "vscode";

export class TokenTypeProvider {
  private static tokenCache: { [uri: string]: vscode.SemanticTokens } = {};

  public static async getTokenTypeAtCursor(
    editor: vscode.TextEditor,
  ): Promise<string | undefined | null> {
    const position = editor.selection.active;
    const document = editor.document;

    if (!document) {
      return undefined;
    }
    const cacheKey = document.uri.toString();
    let semanticTokens = TokenTypeProvider.getCachedTokens(cacheKey);
    if (!semanticTokens) {
      semanticTokens = await TokenTypeProvider.getSemanticTokens(document);
      if (!semanticTokens) {
        return undefined;
      }
      TokenTypeProvider.tokenCache[cacheKey] = semanticTokens;
    }

    const tokens = semanticTokens.data;
    let currentLine = 0;
    let currentStartCharacter = 0;
    for (let i = 0; i < tokens.length; i += 5) {
      const deltaLine = tokens[i];
      const deltaStartCharacter = tokens[i + 1];
      // const length = tokens[i + 2];
      const tokenType = tokens[i + 3];
      // const tokenModifiers = tokens[i + 4];

      currentLine += deltaLine;
      currentStartCharacter =
        deltaLine === 0
          ? currentStartCharacter + deltaStartCharacter
          : deltaStartCharacter;

      if (
        position.line === currentLine &&
        position.character === currentStartCharacter
      ) {
        return TokenTypeProvider.getTokenTypeName(document.uri, tokenType);
      }
    }

    return null;
  }

  public static async getTokenTypeName(
    uri: vscode.Uri,
    tokenType: number,
  ): Promise<string | null> {
    const semanticTokensLegend = await vscode.commands.executeCommand<
      vscode.ProviderResult<vscode.SemanticTokensLegend>
    >("vscode.provideDocumentSemanticTokensLegend", uri);

    return semanticTokensLegend?.tokenTypes[tokenType] || "unknown";
  }

  public static async getSemanticTokens(
    document: vscode.TextDocument,
  ): Promise<vscode.SemanticTokens | undefined> {
    let semanticTokens: vscode.SemanticTokens | null | undefined = null;
    try {
      const cancelToken = new vscode.CancellationTokenSource();
      semanticTokens = await vscode.commands.executeCommand<
        vscode.ProviderResult<vscode.SemanticTokens>
      >("vscode.provideDocumentSemanticTokens", document.uri, cancelToken);
    } catch (error: unknown) {
      vscode.window.showWarningMessage(
        `Error getting document semantic tokens. ${error}`,
      );
      return undefined;
    }

    if (!semanticTokens) {
      return undefined;
    }
    return semanticTokens;
  }

  public static getCachedTokens(
    uri: string,
  ): vscode.SemanticTokens | undefined {
    return TokenTypeProvider.tokenCache[uri];
  }

  public static clearTokenCache(uri: string) {
    delete TokenTypeProvider.tokenCache[uri];
  }
}
