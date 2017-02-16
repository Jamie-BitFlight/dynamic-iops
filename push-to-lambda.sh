#!/bin/bash -ex
#
# Build AWS Lambda function ZIP file and upload to S3
# you need pip installed, and python, and awscli
#
# Usage: ./push-to-lambda S3BUCKET S3KEY
#
# ./push-to-lambda run.bitflight.io lambda/project.zip
s3bucket=${1:?Specify target S3 bucket name}
s3key=${2:?Specify target S3 key}
target=s3://$s3bucket/$s3key

if ! type aws > /dev/null; then
	pip install awscli
fi

tmpdir=$(mktemp -d /tmp/lambda-XXXXXX)
zipfile=$tmpdir/lambda.zip

(cd $tmpdir; npm install aws-sdk; zip -r9 $zipfile node_modules)

# AWS Lambda function (with the right name)
rsync -va modify-volume-event.js $tmpdir/index.js
(cd $tmpdir; zip -r9 $zipfile index.js)



# Upload to S3
aws s3 cp --acl=public-read $zipfile $target
aws lambda update-function-code --region us-west-2 --function-name increaseIOPS --s3-bucket $s3bucket --s3-key $s3key
# Clean up
rm -rf $tmpdir