import { ObjectSubstitute } from "./Transformations";
import { ProxyObjectContext, ProxyPropertyContext, ProxyMethodPropertyContext } from "./Context";
import { stringifyCalls } from "./Utilities";

export class Substitute {
    static for<T>(): ObjectSubstitute<T> {
        const objectContext = new ProxyObjectContext();
        
        let thisProxy: ObjectSubstitute<T>;
        return thisProxy = new Proxy(() => { }, {
            apply: (_target, _thisArg, argumentsList) => {
                const propertyContext = objectContext.property;
                if(propertyContext.type === 'function') {
                    console.log(objectContext.calls.actual.map(x => x.property).filter(x => x.type === 'function').map((x: any) => x.method));

                    const existingCall = objectContext.findActualMethodCall(propertyContext.name, argumentsList); 
                    if(!existingCall)
                        return void 0;
                    
                    return propertyContext.method.returnValues[existingCall.callCount++];
                }

                const newMethodPropertyContext = propertyContext.promoteToMethod();
                newMethodPropertyContext.method.arguments = argumentsList;
                newMethodPropertyContext.method.returnValues = null;

                return thisProxy;
            },
            get: (target, property) => {
                if (typeof property === 'symbol') {
                    if (property === Symbol.toPrimitive)
                        return () => void 0;

                    return void 0;
                }

                if (property === 'valueOf')
                    return void 0;

                if (property === 'toString')
                    return (target[property] || '').toString();

                if (property === 'inspect')
                    return () => '{SubstituteJS fake}';

                if (property === 'constructor')
                    return () => thisProxy;

                const currentPropertyContext = objectContext.property;
                if (property === 'returns') {
                    if(currentPropertyContext.type === 'object')
                        return (...args: any[]) => currentPropertyContext.returnValues = args;

                    if(currentPropertyContext.type === 'function')
                        return (...args: any[]) => currentPropertyContext.method.returnValues = args;
                }

                if (property === 'received') {
                    return (count?: number) => {
                        if(count === void 0)
                            count = null;

                        objectContext.setExpectedCallCount(count);
                        return thisProxy;
                    };
                }

                const existingCall = objectContext.findActualPropertyCall(property.toString(), 'read');
                if(existingCall) {
                    const existingCallProperty = existingCall.property;
                    if(existingCallProperty.type === 'function')
                        return thisProxy;
                    
                    const expectedCall = objectContext.calls.expected;
                    if(expectedCall && expectedCall.callCount !== void 0) {
                        const expectedCallProperty = new ProxyPropertyContext();
                        expectedCallProperty.access = 'read';
                        expectedCallProperty.type = 'object';
                        expectedCallProperty.name = property.toString();

                        expectedCall.property = expectedCallProperty;

                        let shouldFail = 
                            (expectedCall.callCount === null && existingCall.callCount === 0) ||
                            (expectedCall.callCount !== null && expectedCall.callCount !== existingCall.callCount);

                        if(shouldFail)
                            throw new Error('Expected ' + (expectedCall.callCount === null ? 'at least one' : expectedCall.callCount) + ' call(s) to the method ' + expectedCallProperty.name + ', but received ' + existingCall.callCount + ' of such call(s).\nOther calls received:' + stringifyCalls(expectedCallProperty, objectContext.calls.actual));

                        return thisProxy;
                    }

                    if(!existingCallProperty.returnValues)
                        return void 0;

                    return existingCallProperty.returnValues[existingCall.callCount++];
                }

                const newPropertyContext = new ProxyPropertyContext();
                newPropertyContext.name = property.toString();
                newPropertyContext.type = 'object';
                newPropertyContext.access = 'read';
                newPropertyContext.returnValues = null;

                objectContext.property = newPropertyContext;

                objectContext.addActualPropertyCall();

                return thisProxy;
            }
        }) as any;

        // const findExistingCall = (calls: Call[]) => findCallMatchingArguments(calls, localRecord.arguments);

        // const findOrCreateExistingCall = (calls: Call[]) => {
        //     let existingCall = findExistingCall(calls);
        //     if (!existingCall) {
        //         existingCall = { 
        //             callCount: 0, 
        //             arguments: localRecord.arguments,
        //             name: localRecord.property.toString()
        //         };
        //         calls.push(existingCall);
        //     }

        //     return existingCall;
        // };

        // const assertExpectedCalls = () => {
        //     const existingCall = findExistingCall(localRecord.calls);
        //     if(!localRecord.arguments || localRecord.arguments.length === 0 || ((localRecord.expectedCallCount === -1 && existingCall.callCount === 0) || (localRecord.expectedCallCount !== -1 && localRecord.expectedCallCount !== existingCall.callCount))) {
        //         throw new Error('Expected ' + (localRecord.expectedCallCount === -1 ? 'at least one' : localRecord.expectedCallCount) + ' call(s) to the property ' + localRecord.property + ', but received ' + existingCall.callCount + ' of such call(s).\nOther calls received:' + stringifyCalls(localRecord.calls));
        //     }

        //     const expectedCall = findExistingCall(localRecord.expectedCalls);
        //     if (existingCall === null || ((expectedCall.callCount === -1 && existingCall.callCount === 0) || (expectedCall.callCount !== -1 && expectedCall.callCount !== existingCall.callCount))) {
        //         throw new Error('Expected ' + (expectedCall.callCount === -1 ? 'at least one' : expectedCall.callCount) + ' call(s) to the method ' + localRecord.property + ' with arguments ' + stringifyArguments(expectedCall.arguments) + ', but received ' + existingCall.callCount + ' of such call(s).\nOther calls received:' + stringifyCalls(localRecord.calls));
        //     }
        // }
    }
}