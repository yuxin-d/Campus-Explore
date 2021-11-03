import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as k from "./UtilsK";
import * as k2 from "./UtilsK2";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
let dataSets: InsightDataset[] = [];

// DO NOT USE THESE
let buildingNames: string[] = [];
let shortNames: string[] = [];
let allBuildings: any[] = [];
// DO NOT USE THESE
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.trace("InsightFacadeImpl::init()");
		k2.init(dataSets);
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let numRows: number;
		let JSZip = require("jszip");
		let zip = new JSZip();
		let addedCourses: any[] = [];
		if (k.checkAddId(id, dataSets)) { // is valid
			return zip.loadAsync(content, {base64: true}).then((dataset: any) => {
				if (kind === InsightDatasetKind.Courses) {
					let allFiles: any = dataset.folder("courses")["files"];
					let allKeys = Object.keys(allFiles);
					numRows = allKeys.length - 1;
					if (numRows < 1) {
						return Promise.reject(new InsightError("Invalid Data"));
					}
					for (const key of allKeys) {
						if (key.length > 8) {
							addedCourses.push(allFiles[key].async("string"));
						}
					}
					try {
						return k.readCourses(addedCourses);
					} catch {
						return Promise.reject(new InsightError("Could not read"));
					}
				} else {
					return this.getBuildingsFromIndex(dataset).then((buildings: any[]) => {
						return Promise.allSettled(k2.getGets(allBuildings, buildings, shortNames, buildingNames));
					}).then((addresses: any) => {
						return k2.getAllRoomData(addresses);
					}).catch ((error: any) => {
						return Promise.reject(error);
					});
				}
			}).then(
				(success: any) => {
					return k2.succesful(success, id, kind, numRows, dataSets);
				},
				function(error: any) {
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


	/**
	 * Remove a dataset from insightUBC.
	 *
	 * @param id  The id of the dataset to remove. Follows the format /^[^_]+$/
	 *
	 * @return Promise <string>
	 *
	 * The promise should fulfill upon a successful removal, reject on any error.
	 * Attempting to remove a dataset that hasn't been added yet counts as an error.
	 *
	 * An id is invalid if it contains an underscore, or is only whitespace characters.
	 *
	 * The promise should fulfill the id of the dataset that was removed.
	 * The promise should reject with a NotFoundError (if a valid id was not yet added)
	 * or an InsightError (invalid id or any other source of failure) describing the error.
	 *
	 * This will delete both disk and memory caches for the dataset for the id meaning
	 * that subsequent queries for that id should fail unless a new addDataset happens first.
	 */
	public removeDataset(id: string): Promise<string> {
		if (!k.checkRemoveId(id, dataSets)) {
			return Promise.reject(new InsightError("Invalid id"));
		}
		if (!dataSets.map((obj: any) => obj["id"]).includes(id)) {
			return Promise.reject(new NotFoundError("Not in memory"));
		}
		dataSets = dataSets.filter((obj: any) => obj["id"] !== id);
		try {
			let fs = require("fs");
			fs.unlinkSync(`./src/data/${id}.json`);
		} catch {
			return Promise.reject(new InsightError("Error deleting"));
		}
		return Promise.resolve(id);
	}


	public performQuery(query: any): Promise<any[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(dataSets);
	}
}
