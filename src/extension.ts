// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';
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

function expandInclude(content: string, docPath: string, recDepth: number = 0): string {
	if(recDepth > 100)
	{
		throw new Error("Reached maximum recursion depth of 100 while expanding includes. Do you have circular include?");
	}
	return content.replace(/#include\s"(.*?)",?/gm, (pattern, inclPath) => 
	{
        let absPath = path.resolve(docPath, inclPath);
        if(fs.existsSync(absPath))
        {          
            let inclContent: string = fs.readFileSync(absPath).toString();

            return expandInclude(inclContent, path.dirname(absPath), recDepth + 1);
        }
        return `#include "${inclPath}"`;
	});
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    function getDocText(): string
    {
		let editor = vscode.window.activeTextEditor;
		if(!editor)
		{
			vscode.window.showErrorMessage('No active document is open');
			return "";
        }
        return editor.document.getText();
    }

    function parseCode(): RegExpExecArray[]
    {
		let rgxEntryPoint = new RegExp(/float(\d?)\smain\(([\w\s:,]*)\).*?^{(.*?)^}/msi);
		
        let docText = getDocText();
        
		let entryPointMatch = rgxEntryPoint.exec(docText);
		if(!entryPointMatch)
		{
			vscode.window.showErrorMessage("Couldn't find an entrypoint!");
			return [];
		}
        console.log(`Main Entrypoint found with parameters ${entryPointMatch[2]}`);
        return [ entryPointMatch ];
    }

    function generateCode(code: string, escape: boolean): string
    {
		let editor = vscode.window.activeTextEditor;
		if(!editor)
		{
			vscode.window.showErrorMessage('No active document is open');
			return "";
        }
        
        let docPath = path.dirname(editor.document.fileName);
        let outCode = expandInclude(code, docPath);
        if(escape)
        {
            outCode = outCode
                .replace(/\\[\n\r][\n\r]/gm, ' ')
                .replace(/\\[\n\r]/gm, ' ');
            outCode = outCode
                .replace(/\n/gm, '\\n')
                .replace(/\r/gm, '\\r')
                .replace(/"/gm, '\\"');
        }
        return outCode;
    }

	//Mustache.escape = (text: string) => text;

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let generateNodeCommand = vscode.commands.registerCommand('extension.generateUe4Node', () => {
		// The code you place here will be executed every time your command is executed
        let parsed = parseCode();
        if(parsed.length <= 0) return;
        let entryPointMatch = parsed[0];
        
        let docText = getDocText();
        
        let code: string = entryPointMatch[3];
        let returnN: string = entryPointMatch[1];
        if(returnN.length == 0) returnN = "1";

        code = generateCode(code, true);

		let result: Snippet = {
			code: code,
			n: returnN,
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
		vscode.window.showInformationMessage('Node is copied to clipboard!');
	});

	context.subscriptions.push(generateNodeCommand);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let generateTextCommand = vscode.commands.registerCommand('extension.generateUe4NodeText', () => {
		// The code you place here will be executed every time your command is executed
		
        let parsed = parseCode();
        if(parsed.length <= 0) return;
        let entryPointMatch = parsed[0];
        
		let code = generateCode(entryPointMatch[3], false);
		clipboardy.writeSync(code);

		// Display a message box to the user
		vscode.window.showInformationMessage('Text is copied to clipboard!');
	});

	context.subscriptions.push(generateTextCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
