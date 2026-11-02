const CapabilityMqttHandle = require("./CapabilityMqttHandle");

const ComponentType = require("../homeassistant/ComponentType");
const DataType = require("../homie/DataType");
const EntityCategory = require("../homeassistant/EntityCategory");
const InLineHassComponent = require("../homeassistant/components/InLineHassComponent");
const PropertyMqttHandle = require("../handles/PropertyMqttHandle");

class QuirksCapabilityMqttHandle extends CapabilityMqttHandle {
    /**
     * @param {object} options
     * @param {import("../handles/RobotMqttHandle")} options.parent
     * @param {import("../MqttController")} options.controller MqttController instance
     * @param {import("../../core/ValetudoRobot")} options.robot
     * @param {import("../../core/capabilities/QuirksCapability")} options.capability
     */
    constructor(options) {
        super(Object.assign(options, {
            friendlyName: "Quirks"
        }));

        /** @type {import("../../core/capabilities/QuirksCapability")} */
        this.quirksCapability = options.capability;

        for (const quirk of this.quirksCapability.quirks) {
            const isSwitch = quirk.options.length === 2 &&
                quirk.options.includes("on") &&
                quirk.options.includes("off");

            this.registerChild(
                new PropertyMqttHandle({
                    parent: this,
                    controller: this.controller,
                    topicName: quirk.id,
                    friendlyName: quirk.title,
                    datatype: DataType.ENUM,
                    format: quirk.options.join(","),
                    getter: async () => {
                        return quirk.getter();
                    },
                    setter: async (value) => {
                        await this.quirksCapability.setQuirkValue(quirk.id, value);
                    },
                    helpText: quirk.description,
                    helpMayChange: {
                        "Availability and enum payloads": "Quirks are vendor-specific and may change with firmware updates."
                    }
                }).also((prop) => {
                    this.controller.withHass((hass) => {
                        const autoconf = {
                            state_topic: prop.getBaseTopic(),
                            command_topic: prop.getBaseTopic() + "/set",
                            entity_category: EntityCategory.CONFIG,
                        };

                        if (isSwitch) {
                            Object.assign(autoconf, {
                                payload_off: "off",
                                payload_on: "on",
                                state_off: "off",
                                state_on: "on",
                            });
                        } else {
                            autoconf.options = quirk.options;
                        }

                        prop.attachHomeAssistantComponent(
                            new InLineHassComponent({
                                hass: hass,
                                robot: this.robot,
                                name: `${this.quirksCapability.getType()}_${quirk.id}`,
                                friendlyName: quirk.title,
                                componentType: isSwitch ? ComponentType.SWITCH : ComponentType.SELECT,
                                autoconf: autoconf
                            })
                        );
                    });
                })
            );
        }
    }
}

module.exports = QuirksCapabilityMqttHandle;
