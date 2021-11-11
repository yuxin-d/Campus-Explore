import { IInsightFacade , InsightError, InsightDatasetKind, InsightDataset, NotFoundError, ResultTooLargeError}
	from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
// import {expect} from "chai";
import chai from "chai";
import {testFolder} from "@ubccpsc310/folder-test";
import chaiAsPromised = require("chai-as-promised");
import * as fs from "fs-extra";
chai.use(chaiAsPromised);
const expect = chai.expect;

type Input = any;
type Output = Promise<any[]>;
type Error = "InsightError" | "NotFoundError" | "ResultTooLargeError";

function getFileContent(path: string): string {
	return fs.readFileSync(path).toString("base64");
}

// function clearDatasets(): void {
//   fs.removeSync("data");
//   insightFacade = new InsightFacade();
// }


describe("InsightFacade", function() {

	describe("Add/Remove/List Datasets", function() {
		let insightFacade: IInsightFacade;
		let courses: string;
		let basic: string;
		let empty: string;
		let typeError: string;
		let notJSON: string;
		let zeroSections: string;
		let basic2: string;
		let notCourses: string;
		let rooms: string;
		before(function() {
			insightFacade = new InsightFacade();
			basic = getFileContent("test/resources/archives/basic.zip");
			courses = getFileContent("test/resources/archives/courses.zip");
			empty = getFileContent("test/resources/archives/empty.zip");
			typeError = getFileContent("test/resources/archives/typeError.txt");
			notJSON = getFileContent("test/resources/archives/notJSON.zip");
			zeroSections = getFileContent("test/resources/archives/zeroSections.zip");
			basic2 = getFileContent("test/resources/archives/basic2.zip");
			notCourses = getFileContent("test/resources/archives/notCourses.zip");
			rooms = getFileContent("test/resources/archives/rooms.zip");
		});

		// ID Checking

		it("Should fail due to underscore in ID", function() {
			const result = insightFacade.addDataset("_", basic, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Should fail due to only spaces in ID", function() {
			const result = insightFacade.addDataset("   ", basic, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Should fail due to only tabs in ID", function() {
			const result = insightFacade.addDataset("\t\t", basic, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Should fail due to only newlines in ID", function() {
			const result = insightFacade.addDataset("\n\n", basic, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Should fail due to only whitespaces in ID", function() {
			const result = insightFacade.addDataset(" \t\n", basic, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		// Error check

		it("Does not accept empty zip", function() {
			const result = insightFacade.addDataset("empty", empty, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Does not accept non-Zips", function() {
			const result = insightFacade.addDataset("typeError", typeError, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Does not accept single non-JSON", function() {
			const result = insightFacade.addDataset("notJSON", notJSON, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Does not accept dataset with zero Sections", function() {
			const result = insightFacade.addDataset("zeroSections", zeroSections, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		// it("Does not accept root not named courses", function() {
		//   const result = insightFacade.addDataset("notCourses", notCourses, InsightDatasetKind.Courses);
		//   return expect(result).eventually.to.be.rejectedWith(InsightError);
		// })

		// Check empty listData
		it("Should return an empty list", function() {
			const result = insightFacade.listDatasets();
			return expect(result).eventually.to.deep.include.members([]);
		});

		it("Should have length 0", function() {
			const result = insightFacade.listDatasets();
			return expect(result).eventually.to.have.length(0);
		});

		// First valid add

		it("Should add a valid dataset", function() {
			const shouldEq = ["basic"];
			const result = insightFacade.addDataset("basic", basic, InsightDatasetKind.Courses);
			return expect(result).eventually.to.deep.include.members(shouldEq);
		});

		// Check one listData
		it("Should list one item", function() {
			const result = insightFacade.listDatasets();
			return expect(result).eventually.to.deep.include.members([
				{
					id: "basic",
					kind: InsightDatasetKind.Courses,
					numRows: 1,
				}
			]);
		});

		it("Should have length 1", function() {
			const result = insightFacade.listDatasets();
			return expect(result).eventually.to.have.length(1);
		});

		it("Does not accept duplicate IDs", function() {
			const result = insightFacade.addDataset("basic", basic, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		// Second valid add

		it("Should add a second valid dataset", function() {
			const shouldEq = ["basic", "basic2"];
			const result = insightFacade.addDataset("basic2", basic2, InsightDatasetKind.Courses);
			return expect(result).eventually.to.deep.include.members(shouldEq);
		});

		// Room add
		it("Should add all rooms dataset", function() {
			const shouldEq = ["basic", "basic2", "rooms"];
			const result = insightFacade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			return expect(result).eventually.to.deep.include.members(shouldEq);
		});

		// Room add
		it("Should add a course dataset", function() {
			const shouldEq = ["basic", "basic2", "rooms", "courses"];
			const result = insightFacade.addDataset("courses", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.deep.include.members(shouldEq);
		});

		// Check multiple listDataset

		it("Should list multiple datasets", function() {
			const result = insightFacade.listDatasets();
			return expect(result).eventually.to.deep.equals([
				{
					id: "basic",
					kind: InsightDatasetKind.Courses,
					numRows: 1,
				},
				{
					id: "basic2",
					kind: InsightDatasetKind.Courses,
					numRows: 2,
				},
				{
					id: "rooms",
					kind: InsightDatasetKind.Rooms,
					numRows: 3
				},
				{
					id: "course",
					kind: InsightDatasetKind.Courses,
					numRows: undefined
				}
			]);
		});

		it("Should have length 2", function() {
			const result = insightFacade.listDatasets();
			return expect(result).eventually.to.have.length(4);
		});

	// Remove non-existant dataset
		it("Should not remove non-existant dataset", function() {
			const result = insightFacade.removeDataset("notYetAdded");
			return expect(result).eventually.to.be.rejectedWith(NotFoundError);
		});

		// Check removal ID
		it("Should not have underscore in removal ID", function() {
			const result = insightFacade.removeDataset("_");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Should not be only spaces", function() {
			const result = insightFacade.removeDataset("   ");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Should not be only tabs", function() {
			const result = insightFacade.removeDataset("\t\t");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Should not be only newlines", function() {
			const result = insightFacade.removeDataset("\n\n");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("Should not be only whitespaces", function() {
			const result = insightFacade.removeDataset(" \t\n");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		// Valid removal
		it("Should remove one valid dataset", function() {
			const id: string = "basic";
			const result = insightFacade.removeDataset(id);
			return expect(result).eventually.to.be.deep.equals(id);
		});

		it("Should list the remaining dataset", function() {
			const result = insightFacade.listDatasets();
			return expect(result).eventually.to.deep.include.members([
				{
					id: "basic2",
					kind: InsightDatasetKind.Courses,
					numRows: 2,
				}
			]);
		});

		// Should be able to re-add without error
		it("Should add a valid dataset", function() {
			const shouldEq = ["basic2", "rooms", "basic3"];
			const result = insightFacade.addDataset("basic3", basic, InsightDatasetKind.Courses);
			return expect(result).eventually.to.deep.equal(shouldEq);
		});
	});

		// Reference folder test example
	describe("performQuery", function() {
		let insightFacade: IInsightFacade;
		let all: string;

		before(function() {
			insightFacade = new InsightFacade();
			all = getFileContent("test/resources/archives/all.zip");
			insightFacade.addDataset("all", all, InsightDatasetKind.Courses);
		});

		it("Should error if query onto nothing", function () {
			const result = insightFacade.performQuery(fs.readFileSync("test/resources/queries/basicQuery.json"));
			return expect(result).eventually.to.be.rejectedWith(NotFoundError);
		});

		function assertResult(expected: Output, actual: any) {
			return expect(actual).eventually.to.deep.equals(expected);
		}

		function assertError(expected: Error, actual: any) {
			if (expected === "InsightError") {
				return expect(actual).to.be.rejectedWith(InsightError);
			} else if (expected === "NotFoundError") {
				return expect(actual).to.be.rejectedWith(NotFoundError);
			} else {
				return expect(actual).to.be.rejectedWith(ResultTooLargeError);
			}
		}

		// Some query examples taken from CPSC310 website
		testFolder<Input, Output, Error>(
			"performQuery tests",
			(input: Input): Output => insightFacade.performQuery(input),
			"./test/resources/queries/",
			{
				assertOnResult: assertResult,
				assertOnError: assertError,
			}
		);
	});
});
