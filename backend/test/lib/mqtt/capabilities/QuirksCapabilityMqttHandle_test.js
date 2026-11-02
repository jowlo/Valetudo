const assert = require("node:assert");
const { describe, it } = require("node:test");

const ComponentType = require("../../../../lib/mqtt/homeassistant/ComponentType");
const Quirk = require("../../../../lib/core/Quirk");
const QuirksCapability = require("../../../../lib/core/capabilities/QuirksCapability");
const QuirksCapabilityMqttHandle = require("../../../../lib/mqtt/capabilities/QuirksCapabilityMqttHandle");

describe("QuirksCapabilityMqttHandle", () => {
    it("exposes quirks through MQTT and Home Assistant discovery", async () => {
        const values = {
            "switch-quirk": "on",
            "select-quirk": "pet",
        };
        const capability = new QuirksCapability({
            robot: {},
            quirks: [
                new Quirk({
                    id: "switch-quirk",
                    options: ["on", "off"],
                    title: "Switch Quirk",
                    description: "A toggle",
                    getter: async () => {
                        return values["switch-quirk"];
                    },
                    setter: async (value) => {
                        values["switch-quirk"] = value;
                    }
                }),
                new Quirk({
                    id: "select-quirk",
                    options: ["off", "pet", "wood_floor"],
                    title: "Select Quirk",
                    description: "A selection",
                    getter: async () => {
                        return values["select-quirk"];
                    },
                    setter: async (value) => {
                        values["select-quirk"] = value;
                    }
                })
            ]
        });
        const controller = {
            isInitialized: false,
            refresh: async () => {},
            withHass: (callback) => {
                callback({
                    identifier: "robot",
                    objectId: "robot"
                });
            }
        };
        const handle = new QuirksCapabilityMqttHandle({
            parent: {
                getBaseTopic: () => {
                    return "valetudo/robot";
                }
            },
            controller: controller,
            robot: {},
            capability: capability
        });

        assert.strictEqual(handle.children.length, 2);

        const switchProperty = handle.children[0];
        assert.strictEqual(switchProperty.getBaseTopic(), "valetudo/robot/QuirksCapability/switch-quirk");
        assert.strictEqual(await switchProperty.get(), "on");
        await switchProperty.setter("off");
        assert.strictEqual(values["switch-quirk"], "off");
        assert.strictEqual(switchProperty.hassComponents[0].componentType, ComponentType.SWITCH);
        assert.deepStrictEqual(
            switchProperty.hassComponents[0].getAutoconf(),
            {
                state_topic: "valetudo/robot/QuirksCapability/switch-quirk",
                command_topic: "valetudo/robot/QuirksCapability/switch-quirk/set",
                entity_category: "config",
                payload_off: "off",
                payload_on: "on",
                state_off: "off",
                state_on: "on",
                name: "Switch Quirk",
                default_entity_id: "switch.robot_switch_quirk"
            }
        );

        const selectProperty = handle.children[1];
        assert.strictEqual(await selectProperty.get(), "pet");
        await selectProperty.setter("wood_floor");
        assert.strictEqual(values["select-quirk"], "wood_floor");
        assert.strictEqual(selectProperty.hassComponents[0].componentType, ComponentType.SELECT);
        assert.deepStrictEqual(selectProperty.hassComponents[0].getAutoconf().options, ["off", "pet", "wood_floor"]);
    });
});
