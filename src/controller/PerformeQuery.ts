import * as fs from "fs";

export default class PerformeQuery{
	public doMatchingAction(query: any, allSections: any[]): any[] {
		let subResults: any[] = [];
		let queryKey: any = Object.keys(query)[0]; // do recursion for this function
		switch (queryKey) {
			case "OR":
				for (let subQuery of query[queryKey]) {
					subResults.push(this.doMatchingAction(subQuery, allSections)); // may do refactor later to make it look nicer
				}
				return this.orHelperFn(subResults);
			case "AND":
				for (let subQuery of query[queryKey]) {
					subResults.push(this.doMatchingAction(subQuery, allSections));
				}
				return this.andHelperFn(subResults);
			case "NOT":
				return this.notHelperFn(this.doMatchingAction(query[queryKey], allSections), allSections);
			default:
				// simple operation for touching our base case
				return this.simpleOperationHandler(queryKey, query, allSections);
		}
	}


	private orHelperFn(arrayNew: any[]): any[] {
		let orResult: any[] = [];
		for (let subArray of arrayNew) {
			for (let element of subArray) {
				if (orResult.indexOf(element) === -1) {
					orResult.push(element);
				}
			}
		}
		return orResult;
	}

	private andHelperFn(arrayNew: any[]): any[] {
		if (arrayNew.length === 0) {
			return [];
		}
		let andResult: any[] = [];
		let domain = arrayNew[0];
		for (let element of domain) {
			let isExistInAllArray = true;
			for (let subArr of arrayNew) {
				if (subArr.indexOf(element) === -1) {
					isExistInAllArray = false;
					break;
				}
			}
			if (isExistInAllArray) {
				andResult.push(element);
			}
		}
		return andResult;
	}

	private notHelperFn(arrayNew: any[], allSections: any): any[] {
		let notResult: any[] = [];
		for (let element of allSections) {
			if (arrayNew.indexOf(element) === -1) {
				notResult.push(element);
			}
		}
		return notResult;
	}

	public simpleOperationHandler(opKey: any, query: any, allSections: any): any[] {
		let result: any[] = [];
		let courseProp: any;
		let propValue: any;
		courseProp = Object.keys(query[opKey])[0];
		propValue = query[opKey][courseProp];
		courseProp = courseProp.split("_")[1];
		switch (opKey) {
			case "LT":
				for (let section of allSections) {
					if (section[courseProp] < propValue) {
						// push
						result.push(section);
					}
				}
				return result;
			case "GT":
				for (let section of allSections) {
					if (section[courseProp] > propValue) {
						// push
						result.push(section);
					}
				}
				return result;
			case "EQ":
				for (let section of allSections) {
					if (section[courseProp] === propValue) {
						// push
						result.push(section);
					}
				}
				return result;
			case "IS":
				// invalid with * need tbd by teammate in validation
				result = this.isHelper(propValue, allSections, result, courseProp);
				return result;
				break;
			default:
				// throw exception
				break;
		}
		return [];
	}

	private isHelper(propValue: any, allSections: any, result: any, courseProp: any) {
		if (propValue === "*") {
			result = allSections;
			// *XXX* *XXX XXX*
		} else if (propValue.startsWith("*") && propValue.endsWith("*")) {
			for (let section of allSections) {
				let index = section[courseProp].indexOf(propValue.substring(1, propValue.length - 1));
				if (index > -1) {
					result.push(section);
				}
			}
		} else if (propValue.startsWith("*")) {
			for (let section of allSections) {
				if (section[courseProp].endsWith(propValue.substring(1, propValue.length))) {
					result.push(section);
				}
			}
		} else if (propValue.endsWith("*")) {
			for (let section of allSections) {
				if (section[courseProp].startsWith(propValue.substring(0, propValue.length - 1 ))) {
					result.push(section);
				}
			}
		} else {
			for (let section of allSections) {
				if (section[courseProp] === propValue) {
					result.push(section);
				}
			}
		}
		return result;
	}

	public grabDataset(query: any[]) {
		let id: any = false;
		let res = [];
		let str: string = JSON.stringify(query);
		const files = fs.readdirSync("./data/");
		files.forEach((x) => {
			if (str.indexOf(x.split(".")[0].substring(1) + "_")) {
				id = x;
			}
		});
		if (id !== false) {
			res = JSON.parse(fs.readFileSync("./data/" + id, "utf8"));
			return res;
		} else {
			return [];
		}
	}

	private Sort(arr: any[], orderof: string, order = "asc") {
		arr.sort((a, b) => {
			if (order === "desc") {
				return b[orderof] > a[orderof] ? 1 : -1;
			}
			return a[orderof] > b[orderof] ? 1 : -1;
		});
	}

	private wildCard(inputstring: string, fieldstring: string) {
		if (inputstring.startsWith("*")) {
			inputstring = "." + inputstring;
		}

		if (inputstring.endsWith("*")) {
			inputstring = inputstring.substring(0, inputstring.length - 1);
			inputstring += ".*";
		}
		const reg = new RegExp(inputstring);
		return reg.test(fieldstring);
	}

}
