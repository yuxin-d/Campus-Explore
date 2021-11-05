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
		// All sections, here we need the global variable be available to use, the 'allSections'
		// let allSections: any[] = [1, 2, 3, 4, 5, 6, 7, 8]; // Since Kelvin's datasets does not work, manual-check Fn
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
				this.isHelper(propValue, allSections, result, courseProp);
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
				if (index >= 1 && index < section[courseProp].length - 2) {
					result.push(section);
				}
			}
		} else if (propValue.startsWith("*")) {
			for (let section of allSections) {
				let index = section[courseProp].indexOf(propValue.substring(1, propValue.length));
				if (index >= 1) {
					result.push(section);
				}
			}
		} else if (propValue.endsWith("*")) {
			for (let section of allSections) {
				let index = section[courseProp].indexOf(propValue.substring(0, propValue.length - 1 ));
				if (index > -1 && index < section[courseProp].length - 2) {
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
	}

	public kindDetect(query: any): boolean {
		let q = JSON.stringify(query);
		if (q.includes("courses_")) {
			return true;
		}
		return false;
	}

}
