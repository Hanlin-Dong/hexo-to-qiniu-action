const qiniu = require('qiniu');
const execSync = require('child_process').execSync;


if (process.argv.length < 7) {
    console.log("argv length is wrong.");
    console.log(process.argv);
}
let bucket = process.argv[2];
let accessKey = process.argv[3];
let secretKey = process.argv[4];
let mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
let rootFolder = process.argv[5];
if (rootFolder === ".") {
    rootFolder = "";
}
let domain = process.argv[6];
let subDomain = process.argv[7];
if (subDomain == undefined) {
    subDomain = "";
}
const path_prifix = "_blog_/public/";
const groupSize = 20;


console.log("deploy.js is calling hexo generate ...");
let res = execSync('hexo generate', {cwd: '_blog_'}).toString();
console.log(res);
let relativePaths = [];
let re = /.*?Generated: (.*?)\n.*?/gs
let match = res.match(re);
if (match) {
    for (let m of match) {
        relativePaths.push(m.replace(re, '$1'));
    }
}
console.log("The following paths are newly generated.");
console.log(relativePaths);


let push = function(key, truePath) {
    return new Promise((resolve, reject) => {
        let options = {scope: bucket + ':' + key};
        let putPolicy = new qiniu.rs.PutPolicy(options);
        let uploadToken = putPolicy.uploadToken(mac);
        let config = new qiniu.conf.Config();
        let formUploader = new qiniu.form_up.FormUploader(config);
        let putExtra = new qiniu.form_up.PutExtra();
        formUploader.putFile(uploadToken, key, truePath, putExtra, (err, body, info) => {
            if (err) {
                reject(err);
            }
            if (info && info.statusCode == 200) {
                console.log("Success " + key);
                resolve(info);
            } else {
                console.log("Warning:");
                console.log({ info });
                reject(info);
            }
        });
    })
}

let refresh = function(urls) {
    return new Promise((resolve, reject) => {
        let cdnManager = new qiniu.cdn.CdnManager(mac);
        cdnManager.refreshUrls(urls, (err, respBody, respInfo) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            console.log(respInfo.statusCode);
            console.log(JSON.parse(respBody).error);
            resolve(respInfo);
        });
    });
}



let run = async function (relativePaths) {
    let groups = [];
    while (relativePaths.length !== 0) {
        groups.push(relativePaths.splice(0, groupSize));
    }
    for (let group of groups) {
        let urls = [];
        for (let relativePath of group) {
            let purekey = relativePath.replace("/index.html", "/");
            let key = subDomain === "" ? purekey : purekey === "index.html" ? subDomain + "/" : subDomain + "/" + purekey ;
            let truePath = path_prifix + relativePath;
            let url = domain + "/" + key;
            urls.push(url);
            console.log(`Pushing path ${truePath}: to key: ${key}, target url is ${url}`);
            await push(key, truePath);
        }
        console.log(`Refreshing the above urls.`)
        await refresh(urls);
    }
}

run(relativePaths);
