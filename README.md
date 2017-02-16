# dynamic-iops
Lambda Function to modify EBS IOPS based on EC2 metrics

Create the trust role
Commands:
aws iam create-role --role-name ebs-iops-worker \
    --assume-role-policy-document file://modifyvolume-trust.json

The policy needs to:
1. Write CloudWatch logs, so you can debug the function.
2. Read EC2 information about instances, tags,


aws iam put-role-policy --role-name ebs-iops-worker \
    --policy-name IopsModifyPolicy \
    --policy-document file://iops-modify-policy.json