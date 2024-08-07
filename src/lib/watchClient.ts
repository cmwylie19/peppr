import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import Log from "./logger";

const PROTO_PATH = path.join(__dirname, './apiv1.proto');

const options: protoLoader.Options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
};

const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

const watcherClient = (protoDescriptor.api as any).Watcher;

const client = new watcherClient(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

// Function to start watching a Kubernetes resource
function startWatching(group: string, version: string, resource: string, namespace?: string) {
    const request = { group, version, resource, namespace };

    client.StartWatch(request, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
            Log.error('Error:', error.message);
        } else {
            Log.info('Watch Response:', {response});
        }
    });
}

function configureWatch(sessionId: string) {
    const call = client.WatchEvents();
    // call.on('data', (event: any) => {
    //     Log.debug('Received event:', event);
    // });
    // call.on('error', (error: Error) => {
    //     Log.error('Error:', error.message);
    // });
    // call.on('end', () => {
    //     Log.debug('Stream ended.');
    // });

    call.write({ session_id: sessionId });
    return call
}

export { startWatching, configureWatch };
