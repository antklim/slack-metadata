'use strict'

const aws = require('aws-sdk')
const handler = require('./handler')

exports.handler = (event, context, cb) => {

  const s3 = new aws.S3({apiVersion: 'latest'})
  const sns = new aws.SNS()

  handler.main(event, {s3, sns}, cb)
  return

}
