// space-public-test.js
const { StorageClient } = require('@wallet.storage/fetch-client');
const { Ed25519Signer } = require('@did.coop/did-key-ed25519');
const { v4: uuidv4 } = require('uuid');

// Base URL for the WAS server
const WAS_BASE_URL = 'https://data.pub';

async function testPublicSpaceProvisioning() {
  try {
    console.log('=== Testing WAS public space provisioning ===');
    
    // Generate a new Ed25519 signer (key pair)
    const appDidSigner = await Ed25519Signer.generate();
    console.log('Generated signer with ID:', appDidSigner.id);
    
    // Extract base controller DID (without the key fragment)
    const baseDidController = appDidSigner.id.split('#')[0];
    console.log('Controller DID:', baseDidController);
    
    // Generate a UUID for the space
    const spaceUUID = uuidv4();
    const spaceId = `urn:uuid:${spaceUUID}`;
    console.log('Space ID:', spaceId);
    
    // Create a StorageClient instance
    const storage = new StorageClient(new URL(WAS_BASE_URL));
    console.log('Created StorageClient for:', WAS_BASE_URL);
    
    // Get a reference to a space (doesn't create it yet)
    const space = storage.space({ 
      signer: appDidSigner,
      id: spaceId
    });
    console.log('Created space reference:', space.path);
    
    //! Create the space object with PUBLIC flag
    const spaceObject = {
      controller: baseDidController,
      cc: ["https://www.w3.org/ns/activitystreams#Public"],
      id: spaceId
    };
    
    console.log('Space object to be sent:', JSON.stringify(spaceObject, null, 2));
    
    // Convert space object to a JSON blob
    const spaceObjectBlob = new Blob(
      [JSON.stringify(spaceObject)],
      { type: 'application/json' }
    );
    
    // Create the space on the server by sending a PUT request
    console.log('Sending PUT request to create space...');
    const response = await space.put(spaceObjectBlob, { 
      signer: appDidSigner
    });
    
    console.log('Space PUT response status:', response.status);
    console.log('Space PUT response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`Failed to initialize space. Status: ${response.status}`);
    }
    
    // Wait a moment to make sure the server has processed the request
    console.log('Waiting 2 seconds before verifying...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify the space was created with the public flag
    console.log('Verifying space was created with public flag...');
    const spaceGetResponse = await space.get({ signer: appDidSigner });
    
    console.log('Space GET response status:', spaceGetResponse.status);
    console.log('Space GET response ok:', spaceGetResponse.ok);
    
    if (spaceGetResponse.ok) {
      const spaceData = await spaceGetResponse.json();
      console.log('Retrieved space data:', JSON.stringify(spaceData, null, 2));
      
      // Check if public flag is present
      if (spaceData.public === true) {
        console.log('SUCCESS: public flag is present in space data');
      } else {
        console.log('FAILURE: public flag is missing from space data');
      }
      
      // Now test creating a resource in this space
      console.log('\n=== Testing resource creation in public space ===');
      
      // Generate a unique resource name
      const resourceUUID = uuidv4();
      console.log('Resource UUID:', resourceUUID);
      
      // Create a test resource
      const resource = space.resource(resourceUUID);
      console.log('Resource path:', resource.path);
      
      // Create a test object
      const testObject = {
        test: 'This is a test resource',
        timestamp: new Date().toISOString()
      };
      
      // Convert test object to a JSON blob
      const testObjectBlob = new Blob(
        [JSON.stringify(testObject)],
        { type: 'application/json' }
      );
      
      // Store the test object
      console.log('Storing test resource with public flag...');
      const resourceResponse = await resource.put(testObjectBlob, { 
        signer: appDidSigner,
        public: true
      });
      
      console.log('Resource PUT response status:', resourceResponse.status);
      console.log('Resource PUT response ok:', resourceResponse.ok);
      
      if (!resourceResponse.ok) {
        throw new Error(`Failed to store resource. Status: ${resourceResponse.status}`);
      }
      
      // Wait a moment to make sure the server has processed the request
      console.log('Waiting 2 seconds before testing public access...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test resource access with authentication
      console.log('\n=== Testing resource access WITH authentication ===');
      const resourceGetAuthResponse = await resource.get({ signer: appDidSigner });
      
      console.log('Resource GET (with auth) response status:', resourceGetAuthResponse.status);
      console.log('Resource GET (with auth) response ok:', resourceGetAuthResponse.ok);
      
      if (resourceGetAuthResponse.ok) {
        const resourceData = await resourceGetAuthResponse.json();
        console.log('Retrieved resource data (with auth):', JSON.stringify(resourceData, null, 2));
      }
      
      // Test resource access WITHOUT authentication (direct fetch)
      console.log('\n=== Testing resource access WITHOUT authentication ===');
      const resourceUrl = `${WAS_BASE_URL}${resource.path}`;
      console.log('Testing direct access to:', resourceUrl);
      
      const directResponse = await fetch(resourceUrl);
      
      console.log('Direct GET response status:', directResponse.status);
      console.log('Direct GET response ok:', directResponse.ok);
      
      if (directResponse.ok) {
        const directData = await directResponse.json();
        console.log('Retrieved resource data (without auth):', JSON.stringify(directData, null, 2));
        console.log('SUCCESS: resource is publicly accessible');
      } else {
        console.log('FAILURE: resource is not publicly accessible');
        const directText = await directResponse.text();
        console.log('Error response:', directText);
      }
    } else {
      console.log('Failed to get space data');
      throw new Error(`Failed to get space data. Status: ${spaceGetResponse.status}`);
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testPublicSpaceProvisioning().then(() => {
  console.log('Test completed');
});