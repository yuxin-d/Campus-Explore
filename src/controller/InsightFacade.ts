import { privateEncrypt } from "crypto";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
let dataSets: InsightDataset[];
let allSections: any[] = [];
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.trace("InsightFacadeImpl::init()");
		dataSets = [];
		let fs = require("fs");
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
		// zip.loadAsync(content, {base64: true}).then(function(content: any) {
		// 	return content.files["courses/AANB500"].async('string')
		// }).then(function (txt: any) {
		// 	console.log(txt)
		// })
		return new Promise((resolve, reject) => {
			let fs = require("fs");
			let JSZip = require("jszip");
			let zip = new JSZip();
			let numRows: number;
			let toReject: boolean = false;
			if (this.checkAddId(id)) { // is valid
				let addedCourses: any[] = [];
				zip.loadAsync(content, {base64: true}).then((dataset: any) => {
					numRows = Object.keys(dataset.files).length;
					// Need to check what happens if courses is not a folder
					let allFiles: any = dataset.folder("courses")["files"];
					let allKeys = Object.keys(allFiles);
					numRows = allKeys.length - 1;
					if (numRows < 1) {
						reject(new InsightError("Invalid Data"));
					}
					for (const key of allKeys) {
						if (key.length > 8) {
							addedCourses.push(allFiles[key].async("string"));
						}
					}
					return this.readCourses(addedCourses);
				}).then(
					(success: any) => {
						// https://stackoverflow.com/questions/51577849/how-to-save-an-array-of-strings-to-a-json-file-in-javascript
						// https://stackoverflow.com/questions/12899061/creating-a-file-only-if-it-doesnt-exist-in-node-js
						fs.writeFile(`./src/data/${id}.json`, JSON.stringify(allSections),
							{flag: "wx"}, function (error: any) {
								if (error) {
									return reject(new InsightError("Could not write"));
								}
							});
						this.confirmAddDataset(id, kind, numRows);
						return resolve(dataSets.map((dataset) => {
							return dataset.id;
						}));
					},
					function(error: any) {
						reject(new InsightError());
					}
				);
			} else {
				return reject(new InsightError("ID Error"));
			}
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
			if (courses.length < 1) {
				throw new InsightError("Empty dataset");
			}
			courses.forEach((course) => {
				let result: any[];
				try {
					result =  JSON.parse(course)["result"]; // this is a list of sections
					if (result.length < 1) {
						throw new InsightError("Empty course");
					}
					result.forEach((section) => {
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
					});
				} catch {
					throw new InsightError("Failed to read course");
				}
			});
		});
	}
	// https://stackoverflow.com/questions/10261986/
	// how-to-detect-string-which-only-contains-white-spaces/50971250 code for whitespaces
	private checkAddId(id: string): boolean {
		if (!id) {
			throw new InsightError();
		}
		if (id.includes("_")) {
			throw new InsightError();
		}
		if (!id.replace(/\s/g, "").length) {
			throw new InsightError();
		}
		if (this.isDatasetsContainsId(id)) {
			throw new InsightError();
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

	private queryParser(query: any): any {
		const body = query["WHERE"];
		const listFilters: any[] = [];
		this.parseBody(body, listFilters);
		const options = query["OPTIONS"];
		const listOptions: string[] = [];
		this.parseOptions(options, listOptions);

	}

	private parseBody(body: any, listFilters: any[]): any {
		if (body !== {}) { // not sure if check works
			// Check what type of filter it is
			// Assume only 1 key?
			let filter: string = Object.keys(body)[0];
			if (this.includes(filter, ["LT", "GT", "EQ"])) {
				let mcomparator: any = body[filter]; // Should be an object eg. {"courses_avg": 97}
				let idstring: string = Object.keys(mcomparator)[0]; // eg. "courses_avg"
				let mkey = idstring.split("_"); // List of two items eg. ["courses", "avg"]
				//  Check that id is valid
				if (!this.isDatasetsContainsId(idstring[0])) {
					throw new NotFoundError();
				}
				if (mkey && mkey.length === 2) {
					if (!this.includes(mkey[1], ["avg", "pass", "fail", "audit", "year"])) {
						throw new InsightError();
					}
				}
				let value: number = mcomparator[idstring];
				// ADD to list
			}
			// SCOMPARISON
			if (filter === "IS") {
				let scomparator: any = body[filter];
				let idstring: string = Object.keys(scomparator)[0];
				let skey = idstring.split("_");
				if (!this.isDatasetsContainsId(skey[0])) {
					throw new NotFoundError();
				}
				if (skey && skey.length === 2) {
					if (!this.includes(skey[1], ["dept", "id", "instructor", "title", "uuid"])) {
						throw new InsightError();
					}
				}
				let value: string = scomparator[idstring];
				// ADD to list
			}
			if (this.includes(filter, ["AND", "OR"])) {
				let logic: any[] = body[filter];
				logic.forEach((element) => {
					this.parseBody(element, listFilters);
				});
			}
			if (filter === "NOT") {
				let not: any = body[filter];
				// not sure how to handle not
			} else {
				throw new InsightError();
			}
		}
	}

	// Parses options. Adds all columns to the array. Assuming order is mandatory, it will be last element on list
	private parseOptions(options: any, listOptions: string[]) {
		let columns: string[] = options["COLUMNS"];
		let order: string = options["ORDER"];
		columns.forEach((col) => {
			listOptions.push(col);
		});
		listOptions.push(order);
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

