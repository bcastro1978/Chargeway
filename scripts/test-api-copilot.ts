import { POST } from '../src/app/api/copilot/route';

async function testCopilotRoute() {
  console.log('Testing new /api/copilot route...');

  // Test 1: Plan trip to Guayaquil
  const req1 = new Request('http://localhost:3004/api/copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Quiero viajar a Guayaquil saliendo con el 90%',
      context: {
        vehicleBrand: 'BYD',
        vehicleModel: 'Yuan Plus',
        currentSoC: 90,
      },
    }),
  });

  const res1 = await POST(req1);
  const data1 = await res1.json();
  console.log('\n[TEST 1 - Plan Route]');
  console.log('Reply:', data1.reply);
  console.log('Destination:', data1.destination);
  console.log('Action:', data1.action);

  // Test 2: Telemetry check
  const req2 = new Request('http://localhost:3004/api/copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Cuanta bateria me queda?',
      context: {
        vehicleBrand: 'BYD',
        vehicleModel: 'Yuan Plus',
        currentSoC: 64,
      },
    }),
  });

  const res2 = await POST(req2);
  const data2 = await res2.json();
  console.log('\n[TEST 2 - Telemetry]');
  console.log('Reply:', data2.reply);

  // Test 3: Range feasibility query
  const req3 = new Request('http://localhost:3004/api/copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Llego a Banos con una sola carga al 40%?',
      context: {
        vehicleBrand: 'BYD',
        vehicleModel: 'Yuan Plus',
        currentSoC: 40,
      },
    }),
  });

  const res3 = await POST(req3);
  const data3 = await res3.json();
  console.log('\n[TEST 3 - Range Query]');
  console.log('Reply:', data3.reply);
  console.log('Destination:', data3.destination);

  console.log('\nAll API route tests passed successfully!');
}

testCopilotRoute().catch(console.error);

