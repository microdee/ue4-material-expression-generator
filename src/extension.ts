// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as Mustache from 'mustache';
import * as clipboardy from 'clipboardy';

interface IParam
{
	id: Number;
	name: string;
}
declare type Param = IParam | any;

interface ISnippet
{
	code: string;
	n: string;
	inputs?: [IParam];
}
declare type Snippet = ISnippet | any;

let NodeTemplate = `
Begin Object Class=/Script/UnrealEd.MaterialGraphNode Name="MaterialGraphNode_10"
	Begin Object Class=/Script/Engine.MaterialExpressionCustom Name="MaterialExpressionCustom_1"
	End Object
	Begin Object Name="MaterialExpressionCustom_1"
	Code="{{&code}}"
		OutputType=CMOT_Float{{n}}
		{{#inputs}}
		Inputs({{id}})=(InputName="{{name}}")
		{{/inputs}}
	End Object
	MaterialExpression=MaterialExpressionCustom'"MaterialExpressionCustom_1"'
End Object
`

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	//Mustache.escape = (text: string) => text;

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.generateUe4Node', () => {
		// The code you place here will be executed every time your command is executed
		
		let rgxEntryPoint = new RegExp(/float(\d)\smain\(([\w\s:,]*)\).*?^{(.*?)^}/msi);

		let editor = vscode.window.activeTextEditor;
		if(!editor)
		{
			vscode.window.showErrorMessage('No active document is open');
			return;
		}
		
		let docText = editor.document.getText();
		let entryPointMatch = rgxEntryPoint.exec(docText);
		if(!entryPointMatch)
		{
			vscode.window.showErrorMessage("Couldn't find an entrypoint! (put '// UE4 Snippet' comment after your shader function)");
			return;
		}
		console.log(`Main Entrypoint found with parameters ${entryPointMatch[1]}`);
		
		let params: [string];
		let result: Snippet = {
			code: entryPointMatch[3].replace(/\n/gm, '\\n').replace(/\r/gm, '\\r'),
			n: entryPointMatch[1],
			inputs: []
		}

		entryPointMatch[2].replace(/[a-zA-Z]\w*\s([a-zA-Z]\w*)[\s:]*[\s\w]*,?/gm, (pattern, param) =>
		{
			result.inputs.push({name: param, id: result.inputs.length});
			return pattern;
		});

		docText.replace(/^[a-zA-Z]\w*\s([a-zA-Z]\w*)[^\(\)]*?\;/gm, (pattern, param) =>
		{
			result.inputs.push({name: param, id: result.inputs.length});
			return pattern;
		});

		if(result.inputs.length <= 0) result.inputs = null;
		
		let output = Mustache.render(NodeTemplate, result);
		clipboardy.writeSync(output);

		// Display a message box to the user
		vscode.window.showInformationMessage('Result is copied to clipboard!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
