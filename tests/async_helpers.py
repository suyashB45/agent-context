"""Bound tests and wake sandbox event loops whose cross-thread wakeup is restricted."""

import anyio
import logging

logging.basicConfig(level=logging.WARNING)


async def heartbeat():
    while True:
        await anyio.sleep(0.01)


def run_async(function):
    async def run():
        async with anyio.create_task_group() as group:
            group.start_soon(heartbeat)
            with anyio.fail_after(20):
                await function()
            group.cancel_scope.cancel()
    anyio.run(run)
