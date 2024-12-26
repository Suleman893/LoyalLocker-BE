const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

//Type tells either base64 or file
async function bucketUploader(type, input, folder) {
  let uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${folder}/${uuidv4()}`,
    // ACL: "public-read",
  };

  let format;
  if (type === "base64") {
    //Handle base64 input
    const base64Data = Buffer.from(
      input.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    const mimeType = input.split(";")[0].split(":")[1];
    uploadParams.Body = base64Data;
    uploadParams.ContentEncoding = "base64";
    uploadParams.ContentType = mimeType;
    format = mimeType.split("/")[1];
  } else if (type === "file") {
    // const extension = path.extname(file.originalname);
    const file = input;
    uploadParams.Key = `${folder}/${uuidv4()}`;
    uploadParams.Body = file.buffer;
    uploadParams.ContentType = file.mimetype;
    format = file.mimetype.split("/")[1];
  } else {
    throw new Error("Unsupported upload type");
  }
  try {
    // await s3.send(new PutObjectCommand(uploadParams));
    const upload = new Upload({
      client: s3,
      params: uploadParams,
    });
    await upload.done();

    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
    return {
      format,
      key: uploadParams.Key,
      objectUrl: url,
    };
  } catch (err) {
    throw err;
  }
}

async function deleteFromBucket(key) {
  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  try {
    const res = await s3.send(new DeleteObjectCommand(deleteParams));
    console.log(res);
    return true;
  } catch (err) {
    throw err;
  }
}

module.exports = { bucketUploader, deleteFromBucket };
