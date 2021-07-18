# Hexo to qiniu action

This action deploys hexo.io website to qiniu cloud storage. 

[Qiniu](https://www.qiniu.com/) is a fast and free object storage server provider mainly in China. It is much faster than github pages. For basic uses, it is totally free.

This action can push incrementally or fully on the user's choice.

## Inputs

### `bucket`

The bucket name of your qiniu storage. 

### `access-key` and `secret-key`

These keys can be found in qiniu console. Use secrets to pass these keys.

### `base-folder`

The hexo blog must be wrapped in a folder as if it is created with "hexo init $base-folder". Provide the name of this folder.

### `domain`

Your website domain. e.g.: http://abc.io

### `sub-domain`

An identifier after domain. It should be identical to the `root` without / in the Hexo config file. The result url will be like: http://abc.io/sub-doman/xxx/

### `hexo-cli-version`
    
The hexo cli version in your local env. Default to 4.3.0


## Usage

Before using this action, you need to apply a new qiniu bucket in its object storage Kodo service. 

### Create a bucket

Go to [Qiniu](https://www.qiniu.com/), create an account, and sign in. Then, in the console, go to "Object storage Kodo" > "bucket management", and click on "create".

Give a name of the bucket, select a place, and select "public". 

Go to "bucket settings", switch on the "default index page". This operation will help you use "index.html" as the index page.

Now, your bucket is ready. This actions will push files to this bucket automatically. You can also manage the bucket manually in the qiniu console.

### Obtain keys

The action uses sdk to push files into the bucket. To get the access, you have to find your own keys.

In qiniu console, click on your avatar, go to "key management". Then you will find "AccessKey / SecretKey". These keys must be provided in the GitHub Action secrets. We will go over this later.

### Use your domain

You have to use your own domain in qiniu. In the console, go to "CDN" > "CDN management". Click on "Add". Then, add your own domain, and connect to your bucket.

Now, qiniu part is ready. Let's move to your repository.

### Your blog

Follow the instructions in [Hexo.io](https://hexo.io/). Use `hexo-cli` to create your blog, e.g.

```bash
hexo init myblog
```

A folder named `myblog` will appear. Create your contents in this folder.

### Create a repository

In GitHub, create a new blank repository. It can be either public or private. Clone the repository to your local machine. Copy the whole `myblog` folder into the repository. Now the root will have only one subfolder. You may want to create a `README` file and a `.gitignore` file. `node_modules` folder is not suggested to be pushed into the repo. You need to push `package.json` and `package-lock.json` file.

A suggested `.gitignore` file should be like this

```txt
.DS_Store
Thumbs.db
db.json
*.log
node_modules/
public/
.deploy*/
```

### Create secrets

`secrets` help you keep your keys private. Open the "Settings" of your repo, goto "Secrets", and click "New repository secret". Use `QINIU_ACCESS_KEY` as key, and copy the value from qiniu console. Then create `QINIU_SECRET_KEY` as well.

### Add a workflow

Now let's add a github actions workflow.

Create a file `.github/workflows/deploy.yml` . This file is used to tell GitHub how to run the actions.

The file should be like this

```yaml
name: deploy hexo to qiniu
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 2
        path: master
    - uses: actions/setup-node@v2
      with:
        node-version: 14.x
    - uses: Hanlin-Dong/hexo-to-qiniu-action@v1
      with:
        bucket: your-bucket
        access-key: ${{ secrets.QINIU_ACCESS_KEY }}
        secret-key: ${{ secrets.QINIU_SECRET_KEY }}
        base-folder: myblog
        domain: "http://abc.io"
        sub-domain: ""

```

There are three steps in this single job `deploy` workflow. First, use `checkout@v2` action to checkout your repo to the virtual machine hosted by GitHub. Then, use `setup-node@v2` action to create a node environment. Last, use the action in this repo to deploy.

You may want to change the configs to your own bucket name, base folder, and sub-domain. 

Sometimes you may want to refresh all files in the bucket, instead of pushing incrementally. To realize this, add a manually triggered fully push workflow as well. put it in `.github/workflows/pushall.yml`. The file should be like

```yaml
name: manually deploy hexo to qiniu
on: workflow_dispatch
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 2
        path: master
    - uses: actions/setup-node@v2
      with:
        node-version: 14.x
    - uses: Hanlin-Dong/hexo-to-qiniu-action@v1-full
      with:
        bucket: your-bucket
        access-key: ${{ secrets.QINIU_ACCESS_KEY }}
        secret-key: ${{ secrets.QINIU_SECRET_KEY }}
        base-folder: myblog
        domain: "http://abc.io"
        sub-domain: ""

```

Here, key `on` is set to workflow_dispatch, which means a button will appear in the `Actions` tab in your repo. Then, the only modification is that the tag of this action is changed to `v1-full` . This action will use the current commit to generate all files, and push them all to the cloud.

I use two hexo blogs to manage my Chinese blog and English blog separaterly. In this case, I create two jobs, which will be run separately. The repo tree is like

```bash
.github
cn/
en/
.gitignore
README.md
```

Then, modify the `deploy.yml` file into

```yaml
name: deploy two hexo sites to qiniu
on: [push]
jobs:
  deploy-cn:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 2
        path: master
    - uses: actions/setup-node@v2
      with:
        node-version: 14.x
    - uses: Hanlin-Dong/hexo-to-qiniu-action@v1
      with:
        bucket: your-bucket
        access-key: ${{ secrets.QINIU_ACCESS_KEY }}
        secret-key: ${{ secrets.QINIU_SECRET_KEY }}
        base-folder: cn
        domain: "http://abc.io"
        sub-domain: ""
  deploy-en:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 2
        path: master
    - uses: actions/setup-node@v2
      with:
        node-version: 14.x
    - uses: Hanlin-Dong/hexo-to-qiniu-action@v1
      with:
        bucket: your-bucket
        access-key: ${{ secrets.QINIU_ACCESS_KEY }}
        secret-key: ${{ secrets.QINIU_SECRET_KEY }}
        base-folder: en
        domain: "http://abc.io"
        sub-domain: en
```

In this case, the website in `cn` folder will be visited through the domain directly, because `sub-domain` is blank. However, the `en` folder will be visited by using domain plus the sub-domain `en`. Note that in the Hexo `_config.yml` file, there should be one configuration which is `root`: `/en/`.

# Commit your repo

On the first commit, because the HEAD of the repo does not include the base-folder you specify, the action will fail. You should manually trigger the full push workflow in the `Actions` tab. 

Then, each time you add any file, the incremental action will automatically run.
