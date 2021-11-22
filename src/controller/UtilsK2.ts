import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import { parse as p5} from "parse5";
import * as k from "./UtilsK";
import { inherits } from "util";
import Decimal from "decimal.js";


export function getTBody(child: any) {
	child = k.returnChild(child, "div", "class", "view-content");
	child = k.returnChild(child, "table");
	let tbody = k.returnChild(child, "tbody");
	return tbody.filter((obj: any) => obj["nodeName"] && obj["nodeName"] === "tr");
}

export function getInfo(tbody: any, indexes: any[], buildingNames: any[], shortNames: any[]) {
	for (const tr of tbody) {
		if (!tr["childNodes"]) {
			continue;
		}
		let tds: any[] = tr["childNodes"];
		tds = tds.filter((obj: any) => obj["nodeName"] && obj["nodeName"] === "td");
		if (tds.length === 5) {
			indexes.push(k.makeIndex(tds[4]));
			let td2 = tds[2];
			if (td2["childNodes"]) {
				for (const tdChild of td2["childNodes"]) {
					if (k.isBName(tdChild)) {
						buildingNames.push(tdChild["childNodes"][0]["value"]);
						break;
					}
				}
			}
			let td1 = tds[1];
			if (td1["childNodes"]) {
				for (const tdChild of td1["childNodes"]) {
					if (tdChild["nodeName"] && tdChild["nodeName"] === "#text") {
						if (tdChild["value"]) {
							// https://stackoverflow.com/questions/9364400/remove-not-alphanumeric-characters-from-string
							shortNames.push(tdChild["value"].replace(/\W/g, ""));
							break;
						}
					}
				}
			}

		} else {
			return Promise.reject(new InsightError("Failed to parse"));
		}
	}
}

export function init(dataSets: any[]) {
	let fs = require("fs");
	// https://stackoverflow.com/questions/21194934/how-to-create-a-directory-if-it-doesnt-exist-using-node-js
	if (!fs.existsSync("./data")) {
		fs.mkdirSync("./data");
	}
	let diskDatasets = fs.readdirSync("./data");
	diskDatasets.forEach((disk: any) => {
		let read = fs.readFileSync(`./data/${disk}`).toString("utf8");
		dataSets.push(
			{
				id: disk.split(".")[0].substring(1),
				kind: disk.split(".")[0].charAt(0) === "c" ? InsightDatasetKind.Courses : InsightDatasetKind.Rooms,
				numRows: JSON.parse(read).length
			}
		);
	});
}

export function succesful(success: any, id: string, kind: InsightDatasetKind, numRows: number, dataSets: any[]) {
	// https://stackoverflow.com/questions/51577849/how-to-save-an-array-of-strings-to-a-json-file-in-javascript
	// https://stackoverflow.com/questions/12899061/creating-a-file-only-if-it-doesnt-exist-in-node-js
	let fs = require("fs");
	// fs.writeFile(`./data/${kind === InsightDatasetKind.Courses ? "c" : "r"}${id}.json`, JSON.stringify(success),
	// 	{flag: "wx"}, function (error: any) {
	// 		if (error) {
	// 			return Promise.reject(new InsightError("Could not write"));
	// 		}
	// 	});
	try {
		fs.writeFileSync(
			`./data/${kind === InsightDatasetKind.Courses ? "c" : "r"}${id}.json`, JSON.stringify(success));
		k.confirmAddDataset(id, kind, numRows, dataSets);
	}catch {
		return Promise.reject("Failed to write file");
	}
	return Promise.resolve(dataSets.map((dataset) => dataset.id));
}

export function getGets(allBuildings: any[], buildings: any[], shortNames: string[], buildingNames: string[]) {
	let parse5 = require("parse5");
	allBuildings = buildings.map((building: any) => parse5.parse(building));
	let awaiting: any[] = [];
	let temp1: string[] = [];
	let temp2: string[] = [];
	for (let i = 0; i < allBuildings.length; i++) {
		try {
			temp1.push(k.getBName(allBuildings[i]));
			temp2.push(shortNames[buildingNames.indexOf(temp1[i])]);
		} catch {
			throw new InsightError("Building Names do not match");
		}
	}
	buildingNames = temp1;
	shortNames = temp2;
	for (let i = 0; i < allBuildings.length; i++) {
		let addr: string = k.getAddress(allBuildings[i]);
		awaiting.push(k.httpGet(addr, buildingNames[i], shortNames[i], allBuildings[i]));
	}
	return awaiting;
}

export function getAllRoomData(addresses: any): any {
	addresses = addresses.filter((obj: any) => obj["status"] === "fulfilled");
	// List of list of LOC, PARSE, Name, Short, Addr
	let validBuildings = addresses.map((obj: any) => obj["value"]);
	let allRoomData: any[] = [];
	for (const building of validBuildings) {
		allRoomData = allRoomData.concat(k.parseBuilding(building[1],
			building[2], building[3], building[4], building[0]));
	}
	if (!allRoomData) {
		return Promise.reject(new InsightError("No rooms"));
	}
	return allRoomData;
}

export function applyFunctions(gp: any, query: any) {
	let newResult = [];
	for (let data of Object.values(gp)) {
		let newData = data as any[];
		let newResultItem = newData[0];
		for (let apply of query.TRANSFORMATIONS.APPLY) {
			let newColumn = Object.keys(apply)[0];
			let applyMethod = Object.keys(apply[newColumn])[0];
			let applyColumn = apply[newColumn][applyMethod];
			let trueColumn = applyColumn.split("_")[1];
			MAX(applyMethod, newData, trueColumn, newResultItem, newColumn);
			MIN(applyMethod, newData, trueColumn, newResultItem, newColumn);
			AVG(applyMethod, newData, trueColumn, newResultItem, newColumn);
			SUM(applyMethod, newData, trueColumn, newResultItem, newColumn);
			COUNT(applyMethod, newData, trueColumn, newResultItem, newColumn);
		}
		newResult.push(newResultItem);
	}
	return newResult;
}

export function COUNT(applyMethod: string, newData: any[], trueColumn: any, newResultItem: any, newColumn: string) {
	if (applyMethod === "COUNT") {
		let curr: any[] = [];
		for (let element of newData) {
			if (!curr.includes(element[trueColumn])) {
				curr.push(element[trueColumn]);
			}
		}
		newResultItem[newColumn] = curr.length;
	}
}

export function SUM(applyMethod: string, newData: any[], trueColumn: any, newResultItem: any, newColumn: string) {
	if (applyMethod === "SUM") {
		let sum = 0;
		for (let element of newData) {
			sum = sum + element[trueColumn];
		}
		newResultItem[newColumn] = Number(sum.toFixed(2));
	}
}

export function AVG(applyMethod: string, newData: any[], trueColumn: any, newResultItem: any, newColumn: string) {
	if (applyMethod === "AVG") {
		let average = 0;
		let total = new Decimal(0);
		for (let element of newData) {
			let nnum = new Decimal(element[trueColumn]);
			total = Decimal.add (nnum, total);
		}
		average = total.toNumber() / (newData.length);
		newResultItem[newColumn] = Number(average.toFixed(2));
	}
}

export function MAX(applyMethod: string, newData: any[], trueColumn: any, newResultItem: any, newColumn: string) {
	if (applyMethod === "MAX") {
		let maximum: any = newData[0][trueColumn];
		for (let element of newData) {
			if (element[trueColumn] > maximum) {
				maximum = element[trueColumn];
			}
		}
		newResultItem[newColumn] = maximum;
	}
}

export function MIN(applyMethod: string, newData: any[], trueColumn: any, newResultItem: any, newColumn: string) {
	if (applyMethod === "MIN") {
		let mini: any = newData[0][trueColumn];
		for (let element of newData) {
			if (element[trueColumn] < mini) {
				mini = element[trueColumn];
			}
		}
		newResultItem[newColumn] = mini;
	}
}
