import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import { parse as p5} from "parse5";

export function httpGet(addr: string, buildingName: string, shortName: string, info: any): Promise<any> {
	addr = addr.split(" ").join("%20");
	let http: any = require("http");
	let url: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team" + "184" + `/${addr}`;
	// console.log(url)
	// https://nodejs.org/api/http.html#httpgetoptions-callback
	let count: number = 0;
	// return Promise.resolve([{lon: 10.0, lat: 9.99}, info, buildingName, shortName, addr.split("%20").join(" ")]);
	return new Promise((resolve, reject) => {
		http.get(url, (result: any) => {
			if (result.statusCode !== 200) {
				reject(new InsightError("Status code != 200"));
			}
			result.setEncoding("utf8");
			let rawData = "";
			result.on("data", (chunk: any) => {
				rawData += chunk;
			}).on("end", () => {
				try {
					resolve([JSON.parse(rawData), info, buildingName, shortName, addr.split("%20").join(" ")]);
				} catch {
					reject(addr);
				}
			});
		}).on("error", (error: any) => {
			reject(new InsightError("Failed to get"));
		});
	});
}

export function returnToDiv(data: any): any {
	try {
		if (data["nodeName"] && data["nodeName"] === "#document") {
			if (data["childNodes"]) {
				let child = returnChild(data["childNodes"], "html");
				child = returnChild(child, "body");
				child = returnChild(child, "div", "class", "full-width-container");
				child = returnChild(child, "div", "id", "main");
				child = returnChild(child, "div", "id", "content");
				child = returnChild(child, "section", "id", "block-system-main");
				child = returnChild(child, "div");
				return child;
			}
		}
	} catch {
		throw new InsightError("Error in returnToDiv");
	}
}

export function parseBuilding(data: any, buildingName: string, shortName: string, addr: string, loc: any): any[] {
	let rooms: any[] = [];
	let child: any = returnToDiv(data);
	if (child) {
		child = returnChild(child, "div", "class", "view-footer");
		child = returnChild(child, "div");
		child = returnChild(child, "div", "class", "view-content");
		child = returnChild(child, "table");
		let tbody = returnChild(child, "tbody");
		tbody = tbody.filter((obj: any) => obj["nodeName"] && obj["nodeName"] === "tr");
		for (const tr of tbody) {
			if (tr["childNodes"]) {
				let tds: any[] = tr["childNodes"].filter((obj: any) => obj["nodeName"] && obj["nodeName"] === "td");
				let thisRoom: any = {
					fullname: buildingName,
					shortname: shortName,
					number: getRoomNumber(tds[0]),
					name: shortName + getRoomNumber(tds[0]),
					address: addr,
					lat: loc["lat"],
					lon: loc["lon"],
					seats: getSeats(tds[1]),
					type: getType(tds[3]),
					furniture: getType(tds[2]),
					href: getHref(tds[4])
				};
				rooms.push(thisRoom);
			}
		}
	}
	return rooms;
}

export function getBName(data: any) {
	let child: any = returnToDiv(data);
	if (child) {
		child = returnChild(child, "div", "class", "view-content");
		child = returnChild(child, "div");
		child = returnChild(child, "div", "id", "buildings-wrapper");
		child = returnChild(child, "div", "id", "building-info");
		child = returnChild(child, "h2");
		child = returnChild(child, "span");
		if (child && child[0]["value"]) {
			return child[0]["value"];
		}
	}
	return "";
}

export function getAddress(data: any): string {
	let child: any = returnToDiv(data);
	if (child) {
		child = returnChild(child, "div", "class", "view-content");
		child = returnChild(child, "div");
		child = returnChild(child, "div", "id", "buildings-wrapper");
		child = returnChild(child, "div", "id", "building-info");
		child = returnChild(child, "div", "class", "building-field");
		child = returnChild(child, "div");
		if (child[0] && child[0]["value"]) {
			return child[0]["value"];
		}
	}
	return "";
}

export function getHref(td4: any): string {
	if (td4["childNodes"]) {
		for (const child of td4["childNodes"]) {
			if (child["nodeName"] && child["nodeName"] === "a") {
				if (child["attrs"] && child["attrs"][0]["value"]) {
					return child["attrs"][0]["value"];
				}
			}
		}
	}
	return "";
}

export function getSeats(td1: any): number {
	if (td1["childNodes"] && td1["childNodes"][0]["value"]) {
		return parseInt(td1["childNodes"][0]["value"].replace(/\W/g, ""), 10);
	}
	return -1;
}

export function getType(td: any): string {
	if (td["childNodes"] && td["childNodes"][0]["value"]) {
		return td["childNodes"][0]["value"].replace(/\W/g, "");
	}
	return "";
}

export function getRoomNumber(td0: any): string {
	if (td0["childNodes"]) {
		for (const child of td0["childNodes"]) {
			if (child["nodeName"] && child["nodeName"] === "a") {
				if (child["childNodes"] && child["childNodes"][0]["nodeName"]) {
					if (child["childNodes"][0]["nodeName"] === "#text") {
						if (child["childNodes"][0]["value"]) {
							return child["childNodes"][0]["value"];
						}
					}
				}
			}
		}
	}
	return "";
}


export function returnChild(data: any[], name: string, key?: string, value?: string): any[] {
	for (const obj of data) {
		if (obj["nodeName"] && obj["nodeName"] === name) {
			if (key && value) {
				if (obj["attrs"] && obj["attrs"][0]["name"] && obj["attrs"][0]["value"]) {
					if (obj["attrs"][0]["name"] === key && (obj["attrs"][0]["value"] === value)) {
						if (obj["childNodes"]) {
							return obj["childNodes"];
						}
					}
				}
			} else {
				if (obj["childNodes"]) {
					return obj["childNodes"];
				}
			}
		}
	}
	return [];
}

export function isBName(tdChild: any): boolean {
	if (tdChild["nodeName"] && tdChild["nodeName"] === "a") {
		if (tdChild["childNodes"] && tdChild["childNodes"][0]["nodeName"]) {
			if (tdChild["childNodes"][0]["nodeName"] === "#text") {
				if (tdChild["childNodes"][0]["value"]) {
					return true;
				}
			}
		}
	}
	return false;
}

export function isAttrs(tdChild: any): boolean {
	return tdChild["nodeName"] && tdChild["nodeName"] === "a" && tdChild["attrs"];
}

export function isHref(aattrs: any): boolean {
	return aattrs && aattrs[0]["name"] && aattrs[0]["value"] && aattrs[0]["name"] === "href";
}

export function makeIndex(td4: any): string {
	let index: any[] = [];
	if (td4["childNodes"]) {
		for (const tdChild of td4["childNodes"]) {
			if (isAttrs(tdChild)) {
				let aattrs: any[] = tdChild["attrs"];
				if (isHref(aattrs)) {
					return aattrs[0]["value"];
				}
			}
		}
	}
	return "";
}

// initialize helper before everything
export function readCourses(addedCourses: any[]): Promise<void | any[]> {
	return Promise.all(addedCourses).then((courses) => {
		let empty: boolean = true;
		let allSections: any[] = []; // delete
		courses.forEach((course) => {
			let result: any[];
			result =  JSON.parse(course)["result"]; // this is a list of sections
			if (result.length > 0) {
				empty = false;
			}
			for (const i in result) {
				let section = result[i];
				let thisSection: any = {
					dept: section["Subject"],
					id: section["Course"],
					avg: section["Avg"],
					instructor: section["Professor"],
					title: section["Title"],
					pass: section["Pass"],
					fail: section["Fail"],
					audit: section["Audit"],
					uuid: section["id"].toString(),
					year: parseInt(section["Year"], 10)
				};
				allSections.push(thisSection); // push to helper member field
			}
		});
		if (empty) {
			return Promise.reject(new InsightError("Empty dataset"));
		} else {
			return allSections; // return helper member
		}
	});
}

export function checkAddId(id: string, dataSets: any[]): boolean {
	if (!id || id.includes("_") || !id.replace(/\s/g, "").length) {
		return false;
	}
	if (dataSets.map((obj: any) => obj["id"]).includes(id)) {
		return false;
	}
	return true;
}

export function checkRemoveId(id: string, dataSets: any[]): boolean {
	if (!id || id.includes("_") || !id.replace(/\s/g, "").length) {
		return false;
	}
	return true;
}

export function confirmAddDataset(id: string, kind: InsightDatasetKind, numRows: number, dataSets: any[]) {
	let newDataset = {
		id: id,
		kind: kind,
		numRows: numRows
	};
	dataSets.push(newDataset); // Add new dataset
}
