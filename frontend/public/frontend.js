// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
function clickListDatasets() {
	console.log("clicked list")
	let xhttp = new XMLHttpRequest();
	xhttp.open("GET", 'datasets')
	xhttp.onload = () => {
		let display = JSON.parse(xhttp.response)["result"];
		console.log(display)
		let msg = ""
		for (dataset of display) {
			msg += `<p>${dataset["id"]}, ${dataset["kind"]}, ${dataset["numRows"]}</p>`
		}
		document.getElementById("msg").innerHTML = msg;
	}
	xhttp.send()
	
}

function clickRemoveDataset(id) {
	console.log("clicked remove")
	let xhttp = new XMLHttpRequest();
	xhttp.open("DELETE", `dataset/${id}`)
	xhttp.onload = () => {
		let resp = JSON.parse(xhttp.response)
		let key = Object.keys(resp)[0]
		let msg = `<p>${resp[key]}</p>`
		document.getElementById("msg").innerHTML = msg
	}
	xhttp.send()
}

// https://stackoverflow.com/questions/29294979/xmlhttprequest-to-upload-a-file-with-parameters
function clickAddDataset(id, kind, file) {
	let xhttp = new XMLHttpRequest();
	let fd = new FormData();
	fd.append("zip", file)
	xhttp.open("PUT", `dataset/${id}/${kind}`)
	xhttp.onload = () => {
		let resp = JSON.parse(xhttp.response)
		let key = Object.keys(resp)[0]
		let msg = `<p>${resp[key]}</p>`
		document.getElementById("msg").innerHTML = msg
	}
	xhttp.setRequestHeader("Content-Type", "application/zip");
	xhttp.send(fd);
}

function clickQuery(query) {
	let xhttp = new XMLHttpRequest();
	xhttp.open("POST", "query")
	xhttp.onload = () => {
		let resp = JSON.parse(xhttp.response)
		let key = Object.keys(resp)[0]
		if (key === "error") {
			let msg = `<p>${resp[key]}</p>`
			document.getElementById("msg").innerHTML = msg
		} else {
			let msg = ""
			for(row of resp["result"]) {
				msg += `<p>${JSON.stringify(row)}</p>`
			}
			document.getElementById("msg").innerHTML = msg
		}
	}
	xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	xhttp.send(query);
}