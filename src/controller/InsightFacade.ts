import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import * as k from "./UtilsK";
import * as k2 from "./UtilsK2";
import PerformeQuery from "./PerformeQuery";
import ValidQuery from "./validQuery";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

// DO NOT USE THESE
let buildingNames: string[] = [];
let shortNames: string[] = [];
let allBuildings: any[] = [];
// DO NOT USE THESE
export default class InsightFacade implements IInsightFacade {
	public dataSets: InsightDataset[] = [];

	constructor() {
		// init helper
		// console.trace("InsightFacadeImpl::init()");
		k2.init(this.dataSets);
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let numRows: number;
		let JSZip = require("jszip");
		let zip = new JSZip();
		let addedCourses: any[] = [];
		if (k.checkAddId(id, this.dataSets)) { // is valid
			return zip.loadAsync(content, {base64: true}).then((dataset: any) => {
				if (kind === InsightDatasetKind.Courses) {
					let allFiles: any = dataset.folder("courses")["files"];
					let allKeys = Object.keys(allFiles);
					numRows = allKeys.length - 1;
					if (numRows < 1) {
						return Promise.reject(new InsightError("Dataset has 0 sections"));
					}
					for (const key of allKeys) {
						if (key.length > 8) {
							addedCourses.push(allFiles[key].async("string"));
						}
					}
					return k.readCourses(addedCourses);
				} else {
					return this.getBuildingsFromIndex(dataset).then((buildings: any[]) => {
						return Promise.allSettled(k2.getGets(allBuildings, buildings, shortNames, buildingNames));
					}).then((addresses: any) => {
						return Promise.resolve(k2.getAllRoomData(addresses));
					}).catch ((error: any) => {
						return Promise.reject(error);
					});
				}
			}).then(
				(success: any) => {
					return k2.succesful(success, id, kind, success.length, this.dataSets);
				},
				(error: any) => {
					return Promise.reject(new InsightError(error));
				}
			);
		}
		return Promise.reject(new InsightError("ID Error"));
	}

	private getBuildingsFromIndex(dataset: any): Promise<any[]> {
		let parse5 = require("parse5");
		let allRooms: any = dataset.folder("rooms")["files"];
		let allKeys: any = Object.keys(allRooms);
		let files: string[] = allKeys.filter((key: string) => key[key.length - 1] !== "/");
		if (!files.includes("rooms/index.htm")) {
			return Promise.reject(new InsightError("No index file"));
		}
		return allRooms["rooms/index.htm"].async("string").then((data: any) => {
			let indexes: any[] = [];
			try {
				let parsed: any = parse5.parse(data);
				let child = k.returnToDiv(parsed);
				if (child) {
					let tbody = k2.getTBody(child);
					buildingNames = [];
					shortNames = [];
					k2.getInfo(tbody, indexes, buildingNames, shortNames);
				}
			} catch {
				return Promise.reject(new InsightError("Failed to parse"));
			}
			return indexes;

		}).then((indexes: any[]) => {
			indexes = indexes.map((index: string) => index.replace(".", "rooms"));
			let addedRooms = indexes.map((index: string) => {
				return allRooms[index].async("string");
			});
			return Promise.all(addedRooms);
		});
	}

	public removeDataset(id: string): Promise<string> {
		if (!k.checkRemoveId(id, this.dataSets)) {
			return Promise.reject(new InsightError("Invalid id"));
		}
		if (!this.dataSets.map((obj: any) => obj["id"]).includes(id)) {
			return Promise.reject(new NotFoundError("Not in memory"));
		}
		let kind = this.dataSets.filter((obj: any) => obj["id"] === id)[0]["kind"];
		this.dataSets = this.dataSets.filter((obj: any) => obj["id"] !== id);
		try {
			// id.json
			let fs = require("fs");
			let pre: string = kind === InsightDatasetKind.Courses ? "c" : "r";
			fs.statSync(`./data/${pre}${id}.json`);
			fs.unlinkSync(`./data/${pre}${id}.json`);
		} catch {
			return Promise.reject(new InsightError("Error deleting"));
		}
		return Promise.resolve(id);
	}

	public performQuery(query: any): Promise<any[]> {
		try {
			let performeQuery = new PerformeQuery();
			let validQuery = new ValidQuery(this.dataSets);
			if (validQuery.isValidQuery(query)) {
				if (query.toString() === "{}") {
					throw new ResultTooLargeError();
				}
				let allSections: any = [];
				allSections = performeQuery.grabDataset(query, this.dataSets);
			// if (performeQuery.kindDetect(query)) {
			// 	allSections = allCourse;
			// } else {
			// 	allSections = allRoom;
			// }
				let result = performeQuery.doMatchingAction(query.WHERE, allSections);
			// result = performeQuery.removeDupLicate(result);
				let options = query.OPTIONS;
				if (result.length > 5000) {
					return Promise.reject(new ResultTooLargeError());
				}
			// GROUP_BY
			// 1. get an array for each group {value1: [x1,x2,x3...], value2: [x4,x5,x6], ...}
			// 2. Create an element for each array [x1,x2,x3...] => {"key": value1, agg: xxx}
				if ("TRANSFORMATIONS" in query) {
					let gp = this.performTrans(query, result);
					result = k2.applyFunctions(gp, query);
				}
				if ("COLUMNS" in options) {
					let columns = options.COLUMNS;
					result = this.processColumn(result, columns);
				}
				if ("ORDER" in options) {
					let key = options.ORDER;
				// https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
					result.sort((a: any, b: any) => {
						if (a[key] < b[key]){
							return -1;
						} else if (a[key] > b[key]) {
							return 1;
						} else {
							return 0;
						}
					});
				}
				result = Array.from(new Set(result));
				return Promise.resolve(result);
			} else {
				return Promise.reject("the query is not valid");
			}
		} catch (e) {
			return Promise.reject(e);
		}
	}

	private performTrans(query: any, result: any) {
		let gp: any = {all: result };
		for (let key of query.TRANSFORMATIONS.GROUP) {
			key = key.split("_")[1];
			let newGp: any = {};
			for (let x in gp) {
				for (let element of gp[x]) {
					let dataKey = x + "_" + key + element[key];
					if (!(dataKey in newGp)){
						newGp[dataKey] = [];
					}
					newGp[dataKey].push(element);
				}
			}
			gp = newGp;
		}
		return gp;
	}

	private processColumn(result: any, columns: any) {
		let actualResult = [];
		for (let x of result) {
			let obj: any = {};
			for (let column of columns) {
				if (column in x) {
					obj[column] = x[column];
					continue;
				}
				let actualColumn = column.split("_")[1];
				obj[column] = x[actualColumn];
			}
			actualResult.push(obj);
		}
		return actualResult;
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.dataSets);
	}
}
