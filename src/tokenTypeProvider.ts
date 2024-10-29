import * as vscode from "vscode";

const tokenCache: { [uri: string]: vscode.SemanticTokens } = {};

export function getTokenTypeAtCursorStart(
  editor: vscode.TextEditor,
): Promise<string | undefined | null> {
  return getTokenTypeAtCursor(editor, true);
}

export function getTokenTypeAtCursorHover(
  editor: vscode.TextEditor,
): Promise<string | undefined | null> {
  return getTokenTypeAtCursor(editor, false);
}

async function getTokenTypeAtCursor(
  editor: vscode.TextEditor,
  atBegin: boolean,
): Promise<string | undefined | null> {
  const position = editor.selection.active;
  const document = editor.document;

  if (!document) {
    return undefined;
  }
  const cacheKey = document.uri.toString();
  let semanticTokens = getCachedTokens(cacheKey);
  if (!semanticTokens) {
    semanticTokens = await getSemanticTokens(document);
    if (!semanticTokens) {
      return undefined;
    }
    tokenCache[cacheKey] = semanticTokens;
  }

  const tokens = semanticTokens.data;
  let currentLine = 0;
  let currentStartCharacter = 0;
  for (let i = 0; i < tokens.length; i += 5) {
    const deltaLine = tokens[i];
    const deltaStartCharacter = tokens[i + 1];
    const length = tokens[i + 2];
    const tokenType = tokens[i + 3];
    // const tokenModifiers = tokens[i + 4];

    currentLine += deltaLine;
    currentStartCharacter =
      deltaLine === 0
        ? currentStartCharacter + deltaStartCharacter
        : deltaStartCharacter;

    const isAtCursor = atBegin
      ? position.line === currentLine &&
        position.character === currentStartCharacter
      : position.line === currentLine &&
        position.character >= currentStartCharacter &&
        position.character <= currentStartCharacter + length - 1;

    if (isAtCursor) {
      return getTokenTypeName(document.uri, tokenType);
    }
  }

  return null;
}

async function getTokenTypeName(
  uri: vscode.Uri,
  tokenType: number,
): Promise<string | null> {
  const semanticTokensLegend = await vscode.commands.executeCommand<
    vscode.ProviderResult<vscode.SemanticTokensLegend>
  >("vscode.provideDocumentSemanticTokensLegend", uri);

  return semanticTokensLegend?.tokenTypes[tokenType] || "unknown";
}

async function getSemanticTokens(
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

function getCachedTokens(uri: string): vscode.SemanticTokens | undefined {
  return tokenCache[uri];
}

export function clearTokenCache(uri: string) {
  delete tokenCache[uri];
}
