'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

let username: string;
let access_token: string;
let tasks: Array<any>;

const request = require('request');

const base_adress = 'http://localhost:45138';

export function getAbsoluteUrl(subPath: string)
{
    return base_adress + subPath;
}


export function base_task_work(work : Function)
{
    // template method -- work with tasks
    const options = {
        method: 'GET',
        url: getAbsoluteUrl('/api/userdata/gettasks'),
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
    };
      
    function callback(error: any, response: any, body: any) 
    {
        if (!error && response.statusCode === 200) 
        {
            tasks = JSON.parse(body);

            work();
        }
        else
        {
            vscode.window.showErrorMessage('Invalid or expired access token!');
        }
    }

    request(options, callback);
}

export function getHtml()
{
    // html render (without template engines)
    let res: string = "";
    for (let i: number = 0; i < tasks.length; ++i)
    {
        res += `Вариант ${tasks[i].TaskVariantNumber} задания ${tasks[i].TaskDescription} — \"${tasks[i].TaskVariantDescription}\"`;
        if (tasks[i].TaskLink !== null && tasks[i].TaskLink !== '')
        {
            res += `<br> <b> Link = ${tasks[i].TaskLink} </b> `;
        }
        else
        {
            res += `<br> <b> No Solution! </b>`;
        }
        res += `<br>`;
    }
    return res;
}

export function activate(context: vscode.ExtensionContext) 
{
    context.subscriptions.push(vscode.commands.registerCommand('extension.showTasks', () => 
    {
        // The code you place here will be executed every time your command is executed
        base_task_work(() => 
        {
            // Tasks output
            const panel = vscode.window.createWebviewPanel(
                'ControlEnv',
                'All Tasks',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                });
            
            panel.webview.html = getHtml();
        });   
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.loginEnv', async () => {
        // login API
        
        const githubName = await vscode.window.showInputBox({
            placeHolder: 'Input GitHub Login'
        });

        const githubPass = await  vscode.window.showInputBox({
            placeHolder: 'Input GitHub Password',
            password: true
        });

        request.post({url: getAbsoluteUrl('/token'), form: {username: githubName, password: githubPass}}, function(err: any, httpResponse: any, body: any) 
        {
            if (!err && httpResponse.statusCode === 200)
            {
                let returnData : any= JSON.parse(body);
                
                username = returnData.username;
                access_token = returnData.access_token;

                vscode.window.showInformationMessage(`Successfully login as ${username}`); // OK
            }
            else if (!err && httpResponse.statusCode === 400)
            {
                vscode.window.showErrorMessage("Invalid login and password!"); // 400 error code
            }
            else
            {
                vscode.window.showErrorMessage("Server Error!"); // server error, etc
            }
        }); 
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.sendLink', async () => {
        
        base_task_work(async () => 
        {
            // API - send github link
            if (tasks && tasks.length > 0)
            {
                let str_arr: string[] = new Array();
                let id_arr: number[] = new Array();

                for (let i = 0; i < tasks.length; ++i)
                {
                    str_arr.push(`${i + 1}) Вариант ${tasks[i].TaskVariantNumber} задания ${tasks[i].TaskDescription} — \"${tasks[i].TaskVariantDescription}\"`);
                    id_arr.push(tasks[i].VariantId);
                }

                let selection: string | undefined = await vscode.window.showQuickPick(str_arr, {canPickMany: false});
                if (selection !== undefined)
                {
                    let idx: number = str_arr.indexOf(selection);
                    let rem_idx: number = id_arr[idx];

                    let Link: string | undefined = await vscode.window.showInputBox({placeHolder: "Input Link..."});

                    if (Link !== undefined)
                    {
                        request.post({url:getAbsoluteUrl('/api/userdata/sendlink'), form: {Id: rem_idx, Link: Link}, headers: {'Authorization': `Bearer ${access_token}`}}, function(err: any,httpResponse: any,body: any)
                        {
                            if (!err && httpResponse.statusCode === 200)
                            {
                                vscode.window.showInformationMessage("Link was sent!"); // OK
                            }
                            else
                            {
                                vscode.window.showErrorMessage("Invalid or expired access token!"); // server error, etc
                            }
                        });
                    }
                }
            }
            else
            {
                vscode.window.showInformationMessage("No tasks for display!");
            }
        });

        
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}