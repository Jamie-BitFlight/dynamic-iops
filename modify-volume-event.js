#!/usr/bin/env node

'use strict';
var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
//var region = process.env.AWS_REGION;
//var ec2 = new AWS.EC2({region: region});
var ec2 = new AWS.EC2();

// Create CloudWatch service object
var cw = new AWS.CloudWatch();

exports.handler = (event, context, callback) => {


        var filter_dr = {
            DryRun: true,
            Filters: [{
                Name: 'tag:iops',
                Values: ['dynamic']
            }]
        };


        ec2.describeInstances(filter_dr, function(err, data) {
            if (err) console.log(err.message);

            var filter = {
                DryRun: false,
                Filters: [{
                    Name: 'tag:iops',
                    Values: ['dynamic']
                }]
            };

            ec2.describeInstances(filter, function(err, data) {
                if (err) return console.log(err.message);

                console.log("tagged: %j", data);
                var read_iops = 0;
                var Ids = {
                    InstanceIds: [],
                    IOPS: []
                };

                data.Reservations.forEach(function(reservation) {
                    reservation.Instances.forEach(function(instance) {

                        Ids.InstanceIds.push(instance.InstanceId);
                        Ids.IOPS.push(read_iops = check_read_iops(instance.InstanceId));
                        console.log("tagged: %s, %d", instance.InstanceId, read_iops);


                        var vol_params = {
                            DryRun: false,
                            Filters: [{
                                Name: "attachment.instance-id",
                                Values: [instance.InstanceId]
                            }, {
                                Name: "volume-type",
                                Values: ["io1"]
                            }]
                        };
                        console.log(vol_params);

                        ec2.describeVolumes(vol_params, function(err, data) {
                            if (err) {
                                console.log(err, err.stack);
                            } else {
                                console.log(data);
                                data.Volumes.forEach(function(volumes) {
                                    console.log(volumes.VolumeId);
                                    increase_iops(volumes.VolumeId);
                                }); //foreach volumes
                            }
                        }); //describevolumes


                    }); //foreach instances
                }); //foreach reservations

            }); //describeinstances
        }); //describeinstances dryrun
    } //exports handler



function increase_iops(volume_id) {
    var vol_params = {
        DryRun: true,
        VolumeId: volume_id,
        /* required */
        DryRun: false,
        Iops: 1000,
        VolumeType: 'io1'
    };

    ec2.modifyVolume(vol_params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
        } // an error occurred
        else {
            console.log(data);
            vol_params.DryRun = false;
            ec2.modifyVolume(vol_params, function(err, data) {
                if (err) {
                    console.log(err, err.stack);
                } // an error occurred
                else {
                    console.log(data);
                }
            }); // successful response
        }
    });
} // increase_iops

function decrease_iops(volume_id) {
    var vol_params = {
        VolumeId: volume_id,
        /* required */
        DryRun: false,
        Iops: 400,
        VolumeType: 'io1'
    };

    ec2.modifyVolume(vol_params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data); // successful response
    });
} // decrease_iops

function set_iops(volume_id, toiops) {
    var vol_params = {
        VolumeId: volume_id,
        /* required */
        DryRun: false,
        Iops: toiops,
        VolumeType: 'io1'
    };

    ec2.modifyVolume(vol_params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data); // successful response
    });
} // set_iops


function check_read_iops(instanceid) {
    var avg = 0;
    var date = new Date();
    var datestart = new Date(date.getTime() - (5 * 60000));
    var dateend = new Date(date.getTime());

    var params = {
        EndTime: dateend,
        /* required */
        MetricName: 'DiskReadOps',
        /* required */
        Namespace: 'AWS/EC2',
        /* required */
        Period: 300,
        /* required */
        StartTime: datestart,
        /* required */
        Dimensions: [{
            Name: 'InstanceId',
            /* required */
            Value: instanceid /* required */
        }],
        Statistics: [
            'Average'
        ],
        Unit: 'Count'
    };
    cw.getMetricStatistics(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log("%j", data); // successful response

        data.Datapoints.forEach(function(datapoints) {
            avg += datapoints.Average;
        });
        avg = avg / data.Datapoints.length;
        console.log("Average iops: %d", avg);
    });
    return avg;
}