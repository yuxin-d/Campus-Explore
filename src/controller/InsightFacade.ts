import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
 let dataSets: InsightDataset[];
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.trace("InsightFacadeImpl::init()");
		dataSets = []
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// zip.loadAsync(content, {base64: true}).then(function(content: any) {
		// 	return content.files["courses/AANB500"].async('string')
		// }).then(function (txt: any) {
		// 	console.log(txt)
		// })

		// zip.loadAsync(content, {base64: true}).then(function(zip: any) {
		// 	console.log(Object.keys(zip.files).length)
		// })

		

		return new Promise((resolve, reject) => {
			if (this.checkAddId(id)) { // is valid
				let newAdd = {
					id: id,
					kind: kind,
					numRows: 0 // determine number of rows
				}
				dataSets.push(newAdd)
				this.addToDisk(id, content)
				resolve(dataSets.map((dataset) => {
					return dataset.id
				}))
			} else {
				reject(new InsightError("Error"))
			}
		});
	}

	private addToDisk(id:string, content: string) {
		let fs = require("fs")
		let JSZip = require("jszip");
		let zip = new JSZip()
		zip.loadAsync(content, {base64: true})
		zip.generateNodeStream({type:'nodebuffer',streamFiles:true}).pipe(fs.createWriteStream(`${id}.zip`)).on('finish', function () {
			console.log(`${id}.zip written.`);
		});
	}
	//https://stackoverflow.com/questions/10261986/how-to-detect-string-which-only-contains-white-spaces/50971250 code for whitespaces
	private checkAddId(id: string): boolean {
		if (id.includes("_")) {
			throw new InsightError()
		}
		if (!id.replace(/\s/g, '').length) {
			throw new InsightError()
		}
		if (this.isDatasetsContainsId(id)) {
			throw new InsightError()
		}
		return true;
	}

	private isDatasetsContainsId(id: string) {
		dataSets.forEach(element => {
			if (element.id == id) {
				return true;
			}
		})
		return false;
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
		const body = query["WHERE"]
		const listFilters: any[] = []
		this.parseBody(body, listFilters)
		
		const options = query["OPTIONS"]
		const listOptions: string[] = []
		this.parseOptions(options, listOptions)

	}

	private parseBody(body: any, listFilters: any[]): any {
		if (body != {}) { // not sure if check works
			//Check what type of filter it is
			//Assume only 1 key?
			let filter: string = Object.keys(body)[0];
			if (this.includes(filter, ["LT", "GT", "EQ"])) {
				let mcomparator: any = body[filter];
				let idstring: string = Object.keys(mcomparator)[0]
				let mkey = idstring.split("_")
				//TODO Check that id is valid
				if (mkey && mkey.length == 2) {
					if (!this.includes(mkey[1], ["avg", "pass", "fail", "audit", "year"])) {
						throw new InsightError()
					}
				}
				let value: number = mcomparator[idstring];
				//ADD to list
			}
			//SCOMPARISON
			if (filter == "IS") {
				let scomparator: any = body[filter];
				let idstring: string = Object.keys(scomparator)[0]
				let skey = idstring.split("_")
				//TODO Check that id is valid
				if (skey && skey.length == 2) {
					if (!this.includes(skey[1], ["dept", "id", "instructor", "title", "uuid"])) {
						throw new InsightError()
					}
				}
				let value: string = scomparator[idstring]
				//ADD to list
			}
			if (this.includes(filter, ["AND", "OR"])) {
				let logic: any[] = body[filter];
				logic.forEach((element) => {
					this.parseBody(element, listFilters)
				});
			}
			if (filter == "NOT") {
				let not: any = body[filter]
				//not sure how to handle not
			}
			else {
				throw new InsightError()
			}
		}
	}

	//Parses options. Adds all columns to the array. Assuming order is mandatory, it will be last element on list
	private parseOptions(options: any, listOptions: string[]) {
		let columns: string[] = options["COLUMNS"]
		let order: string = options["ORDER"];
		columns.forEach((col) => {
			listOptions.push(col);
		})
		listOptions.push(order);
	}

	private includes(element: any, array: any[]): boolean {
		array.forEach((item) => {
			if (element == item) {
				return true;
			}
		})
		return false;
	}
}
