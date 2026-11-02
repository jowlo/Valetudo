const assert = require("node:assert");
const { describe, it } = require("node:test");

const DreameQuirkFactory = require("../../../../lib/robots/dreame/DreameQuirkFactory");

const CASES = [
    {
        id: DreameQuirkFactory.KNOWN_QUIRKS.MOPPING_WITH_DETERGENT,
        siid: 28,
        piid: 52,
        values: [
            [0, "off"],
            [1, "on"],
        ]
    },
    {
        id: DreameQuirkFactory.KNOWN_QUIRKS.MOP_DOCK_DETERGENT_TANK_A,
        siid: 28,
        piid: 44,
        values: [
            [0, "off"],
            [1, "on"],
        ]
    }
];

describe("DreameQuirkFactory V50 detergent quirks", () => {
    for (const testCase of CASES) {
        it(`reads and writes ${testCase.id}`, async () => {
            const writes = [];
            let currentValue = testCase.values[0][0];
            const factory = new DreameQuirkFactory({
                robot: {
                    miotHelper: {
                        readProperty: async (siid, piid) => {
                            assert.strictEqual(siid, testCase.siid);
                            assert.strictEqual(piid, testCase.piid);

                            return currentValue;
                        },
                        writeProperty: async (siid, piid, value) => {
                            writes.push({
                                siid: siid,
                                piid: piid,
                                value: value
                            });
                        }
                    }
                }
            });
            const quirk = factory.getQuirk(testCase.id);

            for (const [miotValue, quirkValue] of testCase.values) {
                currentValue = miotValue;
                assert.strictEqual(await quirk.getter(), quirkValue);

                await quirk.setter(quirkValue);
                assert.deepStrictEqual(writes.pop(), {
                    siid: testCase.siid,
                    piid: testCase.piid,
                    value: miotValue
                });
            }

            await assert.rejects(quirk.setter("invalid"), /Received invalid value/);
        });
    }

    it("reads and writes the Tank B detergent type and frequency", async () => {
        const writes = [];
        let values = {
            45: 0,
            76: 0
        };
        const factory = new DreameQuirkFactory({
            robot: {
                miotHelper: {
                    readProperty: async (siid, piid) => {
                        assert.strictEqual(siid, 28);

                        return values[piid];
                    },
                    writeProperty: async (siid, piid, value) => {
                        assert.strictEqual(siid, 28);
                        writes.push({
                            siid: siid,
                            piid: piid,
                            value: value
                        });
                        values[piid] = value;
                    }
                }
            }
        });
        const typeQuirk = factory.getQuirk(
            DreameQuirkFactory.KNOWN_QUIRKS.MOP_DOCK_DETERGENT_TANK_B
        );
        const frequencyQuirk = factory.getQuirk(
            DreameQuirkFactory.KNOWN_QUIRKS.MOP_DOCK_DETERGENT_TANK_B_FREQUENCY
        );
        const typeCases = [
            [{45: 1, 76: 1}, "off", [[45, 0], [76, 0]]],
            [{45: 0, 76: 2}, "pet", [[76, 0], [45, 1]]],
            [{45: 2, 76: 0}, "wood_floor", [[45, 0], [76, 1]]],
        ];

        for (const [initialValues, quirkValue, expectedWrites] of typeCases) {
            values = initialValues;
            await typeQuirk.setter(quirkValue);
            assert.deepStrictEqual(
                writes.splice(0),
                expectedWrites.map(([piid, value]) => {
                    return {
                        siid: 28,
                        piid: piid,
                        value: value
                    };
                })
            );
            assert.strictEqual(await typeQuirk.getter(), quirkValue);
        }

        values = {45: 1, 76: 0};
        await typeQuirk.setter("pet");
        assert.deepStrictEqual(writes.splice(0), []);

        values = {45: 1, 76: 0};
        assert.strictEqual(await frequencyQuirk.getter(), "standard");
        await frequencyQuirk.setter("high_frequency");
        assert.deepStrictEqual(writes.splice(0), [{siid: 28, piid: 45, value: 2}]);
        assert.strictEqual(await frequencyQuirk.getter(), "high_frequency");

        values = {45: 0, 76: 2};
        assert.strictEqual(await frequencyQuirk.getter(), "high_frequency");
        await frequencyQuirk.setter("standard");
        assert.deepStrictEqual(writes.splice(0), [{siid: 28, piid: 76, value: 1}]);

        values = {45: 0, 76: 0};
        assert.strictEqual(await frequencyQuirk.getter(), "Tank B disabled");
        await assert.rejects(frequencyQuirk.setter("standard"), /Select a Tank B detergent/);
        await assert.rejects(frequencyQuirk.setter("Tank B disabled"), /Select a Tank B detergent/);

        values = {45: 1, 76: 1};
        assert.strictEqual(await typeQuirk.getter(), "pet");
        assert.strictEqual(await frequencyQuirk.getter(), "standard");

        values = {45: 2, 76: 2};
        assert.strictEqual(await typeQuirk.getter(), "pet");
        assert.strictEqual(await frequencyQuirk.getter(), "high_frequency");

        await assert.rejects(typeQuirk.setter("invalid"), /Received invalid value/);
        await assert.rejects(frequencyQuirk.setter("invalid"), /Received invalid value/);
    });
});
