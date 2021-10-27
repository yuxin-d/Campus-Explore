import { parse as p5} from "parse5";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
let dataSets: InsightDataset[];
let allSections: any[] = [];
let allParsedRooms: any[] = [];
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.trace("InsightFacadeImpl::init()");
		dataSets = [];
		let fs = require("fs");
		// https://stackoverflow.com/questions/21194934/how-to-create-a-directory-if-it-doesnt-exist-using-node-js
		if (!fs.existsSync("./src/data")) {
			fs.mkdirSync("./src/data");
		}
		let diskDatasets = fs.readdirSync("./src/data");
		diskDatasets.forEach((disk: any) => {
			let read = fs.readFileSync(`./src/data/${disk}`).toString("utf8");
			// https://stackoverflow.com/questions/48676751/convert-javascript-string-to-literal-array
			dataSets.push(
				{
					id: disk.split(".")[0],
					kind: InsightDatasetKind.Courses,
					numRows: JSON.parse(read.replace(/'/g, '"')).length
				}
			);
		});
	}

	/**
	 * Add a dataset to insightUBC.
	 *
	 * @param id  The id of the dataset being added. Follows the format /^[^_]+$/
	 * @param content  The base64 content of the dataset. This content should be in the form of a serialized zip file.
	 * @param kind  The kind of the dataset
	 *
	 * @return Promise <string[]>
	 *
	 * The promise should fulfill on a successful add, reject for any failures.
	 * The promise should fulfill with a string array,
	 * containing the ids of all currently added datasets upon a successful add.
	 * The promise should reject with an InsightError describing the error.
	 *
	 * An id is invalid if it contains an underscore, or is only whitespace characters.
	 * If id is the same as the id of an already added dataset, the dataset should be rejected and not saved.
	 *
	 * After receiving the dataset, it should be processed into a data structure of
	 * your design. The processed data structure should be persisted to disk; your
	 * system should be able to load this persisted value into memory for answering
	 * queries.
	 *
	 * Ultimately, a dataset must be added or loaded from disk before queries can
	 * be successfully answered.
	 */

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		allSections = [];
		let numRows: number;
		let fs = require("fs");
		let JSZip = require("jszip");
		let zip = new JSZip();
		let addedCourses: any[] = [];
		if (this.checkAddId(id)) { // is valid
			return zip.loadAsync(content, {base64: true}).then((dataset: any) => {
				// numRows = Object.keys(dataset.files).length;
				if (kind === InsightDatasetKind.Courses) {
					// Need to check what happens if courses is not a folder
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
						return this.readCourses(addedCourses);
					} catch {
						return Promise.reject(new InsightError("Could not read"));
					}
				} else {
					this.readRooms(dataset);
				}
			}).then(
				(success: any) => {
					// https://stackoverflow.com/questions/51577849/how-to-save-an-array-of-strings-to-a-json-file-in-javascript
					// https://stackoverflow.com/questions/12899061/creating-a-file-only-if-it-doesnt-exist-in-node-js
					fs.writeFile(`./src/data/${id}.json`, JSON.stringify(allSections),
						{flag: "wx"}, function (error: any) {
							if (error) {
								return Promise.reject(new InsightError("Could not write"));
							}
						});
					this.confirmAddDataset(id, kind, numRows);
					return Promise.resolve(dataSets.map((dataset) => {
						return dataset.id;
					}));
				},
				function(error: any) {
					return Promise.reject(new InsightError(error));
				}
			);
		}
		return Promise.reject(new InsightError("ID Error"));
	}

	private readRooms(dataset: any): Promise<void | any[]> {
		let parse5 = require("parse5");
		let allRooms: any = dataset.folder("rooms")["files"];
		let allKeys: any = Object.keys(allRooms);
		let files: string[] = allKeys.filter((key: string) => key[key.length - 1] !== "/");
		if (!files.includes("rooms/index.htm")) {
			console.log("no index file");
			return Promise.reject(new InsightError("No index file"));
		}
		// numRows = allKeys.length - 1;
		let addedRooms: any[] = [];
		for (const key of allKeys) {
			if (key !== "rooms/index.htm") {
				addedRooms.push(allRooms[key].async("string"));
			}
		}
		console.log("entering promise");
		return Promise.all(addedRooms).then((rooms) => {
			for (const room in rooms) {
				let parsed: any = parse5.parse(room);
				allParsedRooms.push(parsed); // Need to parse the room, check the site
			}
			return allParsedRooms;
		}).then((stuff) => {
			console.log(stuff);
		});
	}

	private confirmAddDataset(id: string, kind: InsightDatasetKind, numRows: number) {
		let newDataset = {
			id: id,
			kind: kind,
			numRows: numRows
		};
		dataSets.push(newDataset); // Add new dataset
	}

	private readCourses(addedCourses: any[]): Promise<void | any[]> {
		return Promise.all(addedCourses).then((courses) => {
			let empty: boolean = true;
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
						uuid: section["id"],
						year: section["Year"]
					};
					allSections.push(thisSection);
				}
			});
			if (empty) {
				return Promise.reject(new InsightError("Empty dataset"));
			}
		});
	}
	// https://stackoverflow.com/questions/10261986/
	// how-to-detect-string-which-only-contains-white-spaces/50971250 code for whitespaces

	private checkAddId(id: string): boolean {
		if (!id) {
			// throw new InsightError();
			return false;
		}
		if (id.includes("_")) {
			return false;
			// throw new InsightError();
		}
		if (!id.replace(/\s/g, "").length) {
			return false;
			// throw new InsightError();
		}
		if (this.isDatasetsContainsId(id)) {
			return false;
			// throw new InsightError();
		}
		return true;
	}

	private isDatasetsContainsId(id: string) {
		let isContains: boolean = false;
		dataSets.forEach((element) => {
			if (element.id === id) {
				isContains = true;
			}
		});
		return isContains;
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: any): Promise<any[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(dataSets);
	}

	private includes(element: any, array: any[]): boolean {
		array.forEach((item) => {
			if (element === item) {
				return true;
			}
		});
		return false;
	}
}
